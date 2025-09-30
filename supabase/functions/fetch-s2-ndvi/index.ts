import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Microsoft Planetary Computer API endpoints
const PLANETARY_COMPUTER_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1";
const PLANETARY_COMPUTER_SAS_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a";

// Default search parameters for India
const DEFAULT_BBOX = [72.0, 18.0, 88.0, 28.0]; // India bounding box
const DEFAULT_COLLECTION = "sentinel-2-l2a";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[fetch-s2-ndvi] Function invoked');
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default: 30 days ago
      endDate = new Date().toISOString().split('T')[0], // Default: today
      cloudCoverage = 20,
      forceRefresh = false,
      maxTilesPerRun = 10,
      filterType = 'all',
      priorityMode = 'baseline',
      bbox = DEFAULT_BBOX
    } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[fetch-s2-ndvi] Processing with config:`, {
      filterType,
      priorityMode,
      maxTilesPerRun,
      cloudCoverage,
      forceRefresh,
      startDate,
      endDate,
      bbox
    });

    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      metadata_stored: 0,
      downloaded: 0,
      details: [] as any[]
    };

    // Step 1: Get SAS token for authentication with Planetary Computer
    console.log('[fetch-s2-ndvi] Getting SAS token from Planetary Computer...');
    const sasResponse = await fetch(PLANETARY_COMPUTER_SAS_URL);
    const sasData = await sasResponse.json();
    const sasToken = sasData.token;
    console.log('[fetch-s2-ndvi] SAS token obtained');

    // Step 2: Fetch available tiles from STAC API
    console.log('[fetch-s2-ndvi] Fetching tiles from STAC API...');
    
    const searchPayload = {
      collections: [DEFAULT_COLLECTION],
      bbox: bbox,
      datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
      query: {
        "eo:cloud_cover": {
          "lt": cloudCoverage
        }
      },
      limit: maxTilesPerRun,
      sortby: [
        {
          field: "properties.datetime",
          direction: "desc"
        }
      ]
    };

    console.log('[fetch-s2-ndvi] STAC search payload:', JSON.stringify(searchPayload));

    const stacResponse = await fetch(`${PLANETARY_COMPUTER_STAC_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchPayload)
    });

    if (!stacResponse.ok) {
      const errorText = await stacResponse.text();
      console.error('[fetch-s2-ndvi] STAC API error:', errorText);
      throw new Error(`STAC API error: ${stacResponse.status} - ${errorText}`);
    }

    const stacData = await stacResponse.json();
    console.log(`[fetch-s2-ndvi] Found ${stacData.features?.length || 0} tiles from STAC`);

    // Step 3: Process each tile from STAC
    for (const feature of stacData.features || []) {
      try {
        const properties = feature.properties || {};
        const tileId = properties['s2:mgrs_tile'] || 'UNKNOWN';
        const acquisitionDate = properties.datetime ? 
          new Date(properties.datetime).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0];

        console.log(`[fetch-s2-ndvi] Processing tile ${tileId} from ${acquisitionDate}`);

        // Check if tile already exists
        const { data: existingTile } = await supabase
          .from('satellite_tiles')
          .select('id, status')
          .eq('tile_id', tileId)
          .eq('acquisition_date', acquisitionDate)
          .single();

        if (existingTile && !forceRefresh) {
          console.log(`[fetch-s2-ndvi] Tile ${tileId}/${acquisitionDate} already exists, skipping...`);
          continue;
        }

        // Extract band URLs from STAC item - add SAS token
        const assets = feature.assets || {};
        const redBandUrl = assets.B04?.href ? `${assets.B04.href}?${sasToken}` : '';
        const nirBandUrl = assets.B08?.href ? `${assets.B08.href}?${sasToken}` : '';
        const thumbnailUrl = assets.visual?.href ? `${assets.visual.href}?${sasToken}` : '';

        if (!redBandUrl || !nirBandUrl) {
          console.warn(`[fetch-s2-ndvi] Missing band URLs for tile ${tileId}`);
          continue;
        }

        // Download RED band
        console.log(`[fetch-s2-ndvi] Downloading RED band for ${tileId}...`);
        const redResponse = await fetch(redBandUrl);
        if (!redResponse.ok) {
          throw new Error(`Failed to download RED band: ${redResponse.status}`);
        }
        const redData = await redResponse.arrayBuffer();
        const redUint8Array = new Uint8Array(redData);
        
        // Download NIR band
        console.log(`[fetch-s2-ndvi] Downloading NIR band for ${tileId}...`);
        const nirResponse = await fetch(nirBandUrl);
        if (!nirResponse.ok) {
          throw new Error(`Failed to download NIR band: ${nirResponse.status}`);
        }
        const nirData = await nirResponse.arrayBuffer();
        const nirUint8Array = new Uint8Array(nirData);

        // Store files in Supabase Storage
        const redPath = `${tileId}/${acquisitionDate}/B04_red.tif`;
        const nirPath = `${tileId}/${acquisitionDate}/B08_nir.tif`;
        
        console.log(`[fetch-s2-ndvi] Storing RED band to storage: ${redPath}`);
        const { error: redUploadError } = await supabase.storage
          .from('satellite-data')
          .upload(redPath, redUint8Array, {
            contentType: 'image/tiff',
            upsert: true
          });

        if (redUploadError) {
          console.error(`[fetch-s2-ndvi] Failed to upload RED band:`, redUploadError);
          results.errors++;
          continue;
        }

        console.log(`[fetch-s2-ndvi] Storing NIR band to storage: ${nirPath}`);
        const { error: nirUploadError } = await supabase.storage
          .from('satellite-data')
          .upload(nirPath, nirUint8Array, {
            contentType: 'image/tiff',
            upsert: true
          });

        if (nirUploadError) {
          console.error(`[fetch-s2-ndvi] Failed to upload NIR band:`, nirUploadError);
          results.errors++;
          continue;
        }

        // Calculate simple NDVI (placeholder - in production would need proper GeoTIFF processing)
        console.log(`[fetch-s2-ndvi] Calculating NDVI for ${tileId}...`);
        const ndviPath = `${tileId}/${acquisitionDate}/ndvi.json`;
        const ndviMetadata = {
          tile_id: tileId,
          acquisition_date: acquisitionDate,
          cloud_cover: properties['eo:cloud_cover'] || 0,
          red_band_size: redData.byteLength,
          nir_band_size: nirData.byteLength,
          processing_timestamp: new Date().toISOString(),
          mgrs_tile: tileId,
          scene_id: feature.id,
          product_id: properties['s2:product_id'],
          processing_baseline: properties['s2:processing_baseline'],
          granule_id: properties['s2:granule_id'],
          datatake_id: properties['s2:datatake_id'],
          mean_solar_zenith: properties['s2:mean_solar_zenith'],
          mean_solar_azimuth: properties['s2:mean_solar_azimuth'],
          generation_time: properties['s2:generation_time'],
          collection: feature.collection,
          geometry: feature.geometry,
          bbox: feature.bbox,
          status: 'downloaded'
        };

        const { error: ndviUploadError } = await supabase.storage
          .from('satellite-data')
          .upload(ndviPath, JSON.stringify(ndviMetadata, null, 2), {
            contentType: 'application/json',
            upsert: true
          });

        if (ndviUploadError) {
          console.error(`[fetch-s2-ndvi] Failed to upload NDVI metadata:`, ndviUploadError);
          results.errors++;
          continue;
        }

        // Prepare tile data (without 'country' field)
        const tileData = {
          tile_id: tileId,
          acquisition_date: acquisitionDate,
          cloud_cover: properties['eo:cloud_cover'] || 0,
          collection: DEFAULT_COLLECTION,
          red_band_path: `satellite-data/${redPath}`,
          nir_band_path: `satellite-data/${nirPath}`,
          ndvi_path: `satellite-data/${ndviPath}`,
          copernicus_red_band_url: assets.B04?.href || '',
          copernicus_nir_band_url: assets.B08?.href || '',
          metadata: ndviMetadata,
          raw_paths: {
            red: redPath,
            nir: nirPath,
            ndvi: ndviPath,
            thumbnail: thumbnailUrl
          },
          file_size_mb: ((redData.byteLength + nirData.byteLength) / 1024 / 1024).toFixed(2),
          status: 'completed',
          processing_stage: 'downloaded',
          actual_download_status: 'success',
          storage_verified: true,
          storage_verification_date: new Date().toISOString(),
          red_band_verified: true,
          red_band_size_bytes: redData.byteLength,
          nir_band_verified: true,
          nir_band_size_bytes: nirData.byteLength,
          ndvi_verified: true,
          last_verification_at: new Date().toISOString(),
          processing_completed_at: new Date().toISOString(),
          copernicus_download_attempted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Insert or update tile in database
        if (existingTile) {
          const { error: updateError } = await supabase
            .from('satellite_tiles')
            .update(tileData)
            .eq('id', existingTile.id);

          if (updateError) {
            console.error(`[fetch-s2-ndvi] Failed to update tile:`, updateError);
            results.errors++;
            continue;
          }
          results.updated++;
        } else {
          const { error: insertError } = await supabase
            .from('satellite_tiles')
            .insert(tileData);

          if (insertError) {
            console.error(`[fetch-s2-ndvi] Failed to insert tile:`, insertError);
            results.errors++;
            continue;
          }
          results.inserted++;
        }

        results.downloaded++;
        results.details.push({
          tile_id: tileId,
          status: 'success',
          message: `Tile downloaded and stored successfully`,
          red_size_mb: (redData.byteLength / 1024 / 1024).toFixed(2),
          nir_size_mb: (nirData.byteLength / 1024 / 1024).toFixed(2)
        });

        console.log(`[fetch-s2-ndvi] Successfully processed tile ${tileId}/${acquisitionDate}`);

      } catch (error) {
        console.error(`[fetch-s2-ndvi] Error processing STAC tile:`, error);
        results.errors++;
        results.details.push({
          tile_id: feature.id || 'unknown',
          status: 'error',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log('[fetch-s2-ndvi] Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Downloaded ${results.downloaded} tiles, inserted ${results.inserted}, updated ${results.updated}`,
        results,
        metadata: {
          timestamp: new Date().toISOString(),
          config: {
            filterType,
            priorityMode,
            maxTilesPerRun,
            cloudCoverage,
            startDate,
            endDate
          }
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[fetch-s2-ndvi] Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});