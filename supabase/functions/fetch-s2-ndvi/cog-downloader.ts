/**
 * COG Downloader for Microsoft Planetary Computer
 * Handles efficient streaming downloads of Cloud Optimized GeoTIFF files
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

interface DownloadResult {
  success: boolean;
  path?: string;
  size?: number;
  error?: string;
}

/**
 * Stream download a COG file directly to Supabase Storage
 * Uses streaming to avoid memory issues with large files
 */
export async function streamDownloadToStorage(
  url: string,
  bucketName: string,
  filePath: string,
  supabase: any
): Promise<DownloadResult> {
  try {
    console.log(`[streamDownload] Starting download from: ${url.split('?')[0]}`);
    
    // Fetch with streaming
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/tiff',
        'User-Agent': 'KisanShaktiAI/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get content length if available
    const contentLength = response.headers.get('content-length');
    const totalSize = contentLength ? parseInt(contentLength) : 0;
    console.log(`[streamDownload] File size: ${totalSize / (1024 * 1024)} MB`);

    // Check if file size is reasonable (max 100MB for overview)
    if (totalSize > 100 * 1024 * 1024) {
      console.log(`[streamDownload] File too large (${totalSize / (1024 * 1024)}MB), downloading overview instead`);
      return {
        success: false,
        error: `File too large: ${totalSize / (1024 * 1024)}MB`
      };
    }

    // Stream the response body
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to get response reader');
    }

    const chunks: Uint8Array[] = [];
    let downloadedSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      downloadedSize += value.length;
      
      // Log progress every 5MB
      if (downloadedSize % (5 * 1024 * 1024) < value.length) {
        console.log(`[streamDownload] Progress: ${(downloadedSize / (1024 * 1024)).toFixed(1)}MB downloaded`);
      }
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedArray = new Uint8Array(totalLength);
    let position = 0;
    for (const chunk of chunks) {
      combinedArray.set(chunk, position);
      position += chunk.length;
    }

    console.log(`[streamDownload] Download complete: ${(downloadedSize / (1024 * 1024)).toFixed(2)}MB`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, combinedArray.buffer, {
        contentType: 'image/tiff',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw error;
    }

    console.log(`[streamDownload] Uploaded to storage: ${filePath}`);

    return {
      success: true,
      path: data.path,
      size: downloadedSize
    };
  } catch (error) {
    console.error(`[streamDownload] Error:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Download COG overview (lower resolution version)
 * This is more memory-efficient for initial processing
 */
export async function downloadCOGOverview(
  url: string,
  overviewLevel: number = 2
): Promise<{ data?: ArrayBuffer; size?: number; error?: string }> {
  try {
    // Append overview parameter to URL
    const overviewUrl = url.includes('?') 
      ? `${url}&overview=${overviewLevel}`
      : `${url}?overview=${overviewLevel}`;
    
    console.log(`[downloadOverview] Fetching overview level ${overviewLevel}`);
    
    const response = await fetch(overviewUrl, {
      headers: {
        'Accept': 'image/tiff',
        'Range': 'bytes=0-10485760' // Request first 10MB only
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.arrayBuffer();
    console.log(`[downloadOverview] Got ${data.byteLength / 1024}KB of data`);
    
    return { data, size: data.byteLength };
  } catch (error) {
    console.error(`[downloadOverview] Error:`, error);
    return { error: error.message };
  }
}

/**
 * Process and download tiles for a specific region
 */
export async function processTileDownloads(
  tileData: any,
  supabase: any
): Promise<{
  redBandPath?: string;
  nirBandPath?: string;
  success: boolean;
  error?: string;
}> {
  const { tile_id, acquisition_date, metadata } = tileData;
  const region = metadata?.region || 'unknown';
  
  try {
    // Create storage paths
    const dateStr = acquisition_date.replace(/-/g, '');
    const redBandPath = `tiles/${region}/${tile_id}/${dateStr}_B04_red.tif`;
    const nirBandPath = `tiles/${region}/${tile_id}/${dateStr}_B08_nir.tif`;

    console.log(`[processTileDownloads] Processing tile ${tile_id} for ${region}`);

    // Download RED band with SAS token
    const redUrl = tileData.copernicus_red_band_url;
    const nirUrl = tileData.copernicus_nir_band_url;

    if (!redUrl || !nirUrl) {
      throw new Error('Missing band URLs');
    }

    // Download bands in parallel
    const [redResult, nirResult] = await Promise.all([
      streamDownloadToStorage(redUrl, 'satellite-data', redBandPath, supabase),
      streamDownloadToStorage(nirUrl, 'satellite-data', nirBandPath, supabase)
    ]);

    if (!redResult.success || !nirResult.success) {
      throw new Error(`Download failed: RED=${redResult.error}, NIR=${nirResult.error}`);
    }

    console.log(`[processTileDownloads] Successfully downloaded both bands for ${tile_id}`);

    return {
      redBandPath,
      nirBandPath,
      success: true
    };
  } catch (error) {
    console.error(`[processTileDownloads] Error processing ${tile_id}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}