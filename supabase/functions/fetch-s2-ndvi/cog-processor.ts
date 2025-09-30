import GeoTIFF from 'https://cdn.skypack.dev/geotiff@2.0.7';

/**
 * COG Resolution Levels
 */
export enum ResolutionLevel {
  THUMBNAIL = 'thumbnail', // 60m - fastest
  MEDIUM = 'medium',       // 20m - balanced
  FULL = 'full'           // 10m - highest quality
}

/**
 * Resolution configuration
 */
const RESOLUTION_CONFIG = {
  thumbnail: {
    imageIndex: 2, // Third overview level (60m)
    suffix: '_60m',
    maxSizeMB: 5
  },
  medium: {
    imageIndex: 1, // Second overview level (20m)
    suffix: '_20m',
    maxSizeMB: 20
  },
  full: {
    imageIndex: 0, // Full resolution (10m)
    suffix: '_10m',
    maxSizeMB: 500
  }
};

/**
 * Download only the overview layer from a COG file
 */
export async function downloadCOGOverview(
  url: string,
  resolution: ResolutionLevel = ResolutionLevel.THUMBNAIL
): Promise<{ data: ArrayBuffer; metadata: any }> {
  console.log(`[downloadCOGOverview] Fetching ${resolution} overview from COG`);
  
  try {
    // Create a GeoTIFF instance from URL (COG-aware)
    const tiff = await GeoTIFF.fromUrl(url);
    const imageCount = await tiff.getImageCount();
    
    console.log(`[downloadCOGOverview] COG has ${imageCount} images/overviews`);
    
    // Get the appropriate image based on resolution level
    const config = RESOLUTION_CONFIG[resolution];
    const imageIndex = Math.min(config.imageIndex, imageCount - 1);
    
    const image = await tiff.getImage(imageIndex);
    const width = image.getWidth();
    const height = image.getHeight();
    const tileWidth = image.getTileWidth();
    const tileHeight = image.getTileHeight();
    
    console.log(`[downloadCOGOverview] Selected image ${imageIndex}: ${width}x${height}, tiles: ${tileWidth}x${tileHeight}`);
    
    // Read just the overview data
    const rasters = await image.readRasters();
    
    // Convert to ArrayBuffer
    const data = rasters[0] as any;
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    
    const metadata = {
      width,
      height,
      resolution,
      imageIndex,
      tileWidth,
      tileHeight,
      samplesPerPixel: image.getSamplesPerPixel(),
      bitsPerSample: image.getBitsPerSample(),
      origin: image.getOrigin(),
      resolution: image.getResolution(),
      bbox: image.getBoundingBox()
    };
    
    console.log(`[downloadCOGOverview] Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB at ${resolution}`);
    
    return { data: buffer, metadata };
  } catch (error) {
    console.error(`[downloadCOGOverview] Error downloading overview:`, error);
    throw error;
  }
}

/**
 * Calculate NDVI from overview data (lower resolution but faster)
 */
export async function calculateNDVIFromOverview(
  redOverview: ArrayBuffer,
  nirOverview: ArrayBuffer,
  metadata: any
): Promise<Uint8Array> {
  console.log(`[calculateNDVIFromOverview] Processing ${metadata.width}x${metadata.height} overview`);
  
  const redData = new Float32Array(redOverview);
  const nirData = new Float32Array(nirOverview);
  
  if (redData.length !== nirData.length) {
    throw new Error(`Band size mismatch: RED=${redData.length}, NIR=${nirData.length}`);
  }
  
  // Create NDVI array (scaled to uint16)
  const ndviData = new Uint16Array(redData.length);
  const noDataValue = 0;
  
  for (let i = 0; i < redData.length; i++) {
    const red = redData[i];
    const nir = nirData[i];
    
    // Check for nodata
    if (red === 0 || nir === 0 || red === -9999 || nir === -9999) {
      ndviData[i] = noDataValue;
      continue;
    }
    
    // Calculate NDVI: (NIR - RED) / (NIR + RED)
    const denominator = nir + red;
    if (denominator === 0) {
      ndviData[i] = noDataValue;
    } else {
      const ndvi = (nir - red) / denominator;
      // Scale from [-1, 1] to [1, 65535] (0 reserved for nodata)
      ndviData[i] = Math.round((ndvi + 1) * 32767) + 1;
    }
  }
  
  console.log(`[calculateNDVIFromOverview] NDVI calculation complete`);
  return new Uint8Array(ndviData.buffer);
}

/**
 * Process NDVI at specified resolution level
 */
export async function processNDVIAtResolution(
  redBandUrl: string,
  nirBandUrl: string,
  resolution: ResolutionLevel = ResolutionLevel.THUMBNAIL
): Promise<{
  ndviData: Uint8Array;
  metadata: any;
  processingTimeMs: number;
}> {
  const startTime = Date.now();
  
  console.log(`[processNDVIAtResolution] Starting ${resolution} processing`);
  
  // Download overview layers in parallel
  const [redResult, nirResult] = await Promise.all([
    downloadCOGOverview(redBandUrl, resolution),
    downloadCOGOverview(nirBandUrl, resolution)
  ]);
  
  // Ensure metadata matches
  if (redResult.metadata.width !== nirResult.metadata.width ||
      redResult.metadata.height !== nirResult.metadata.height) {
    throw new Error('Band dimensions mismatch');
  }
  
  // Calculate NDVI from overview data
  const ndviData = await calculateNDVIFromOverview(
    redResult.data,
    nirResult.data,
    redResult.metadata
  );
  
  const processingTimeMs = Date.now() - startTime;
  console.log(`[processNDVIAtResolution] Completed ${resolution} in ${processingTimeMs}ms`);
  
  return {
    ndviData,
    metadata: {
      ...redResult.metadata,
      processingTimeMs,
      resolution
    },
    processingTimeMs
  };
}

/**
 * Smart multi-resolution processor
 * Processes thumbnail first, then higher resolutions on demand
 */
export async function processMultiResolutionNDVI(
  redBandUrl: string,
  nirBandUrl: string,
  requestedResolution: ResolutionLevel = ResolutionLevel.THUMBNAIL
): Promise<{
  thumbnail?: { data: Uint8Array; metadata: any };
  medium?: { data: Uint8Array; metadata: any };
  full?: { data: Uint8Array; metadata: any };
  totalProcessingTimeMs: number;
}> {
  const startTime = Date.now();
  const results: any = {};
  
  // Always process thumbnail first (fastest)
  console.log(`[processMultiResolutionNDVI] Processing thumbnail overview`);
  const thumbnailResult = await processNDVIAtResolution(
    redBandUrl,
    nirBandUrl,
    ResolutionLevel.THUMBNAIL
  );
  results.thumbnail = {
    data: thumbnailResult.ndviData,
    metadata: thumbnailResult.metadata
  };
  
  // Process medium if requested
  if (requestedResolution === ResolutionLevel.MEDIUM || 
      requestedResolution === ResolutionLevel.FULL) {
    console.log(`[processMultiResolutionNDVI] Processing medium resolution`);
    const mediumResult = await processNDVIAtResolution(
      redBandUrl,
      nirBandUrl,
      ResolutionLevel.MEDIUM
    );
    results.medium = {
      data: mediumResult.ndviData,
      metadata: mediumResult.metadata
    };
  }
  
  // Process full only if explicitly requested
  if (requestedResolution === ResolutionLevel.FULL) {
    console.log(`[processMultiResolutionNDVI] Processing full resolution`);
    const fullResult = await processNDVIAtResolution(
      redBandUrl,
      nirBandUrl,
      ResolutionLevel.FULL
    );
    results.full = {
      data: fullResult.ndviData,
      metadata: fullResult.metadata
    };
  }
  
  const totalProcessingTimeMs = Date.now() - startTime;
  console.log(`[processMultiResolutionNDVI] Total processing time: ${totalProcessingTimeMs}ms`);
  
  return {
    ...results,
    totalProcessingTimeMs
  };
}

/**
 * Check if COG has overview layers
 */
export async function checkCOGOverviews(url: string): Promise<{
  hasOverviews: boolean;
  overviewCount: number;
  resolutions: { index: number; width: number; height: number }[];
}> {
  try {
    const tiff = await GeoTIFF.fromUrl(url);
    const imageCount = await tiff.getImageCount();
    const resolutions = [];
    
    for (let i = 0; i < imageCount; i++) {
      const image = await tiff.getImage(i);
      resolutions.push({
        index: i,
        width: image.getWidth(),
        height: image.getHeight()
      });
    }
    
    return {
      hasOverviews: imageCount > 1,
      overviewCount: imageCount - 1, // First is full resolution
      resolutions
    };
  } catch (error) {
    console.error(`[checkCOGOverviews] Error checking overviews:`, error);
    return {
      hasOverviews: false,
      overviewCount: 0,
      resolutions: []
    };
  }
}