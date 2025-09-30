import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { handleError } from "../_shared/errorHandler.ts";

// Microsoft Planetary Computer API endpoints
const PLANETARY_COMPUTER_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1";
const PLANETARY_COMPUTER_SAS_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a";

// Default search parameters for India
const DEFAULT_BBOX = [72.0, 18.0, 88.0, 28.0]; // India bounding box
const DEFAULT_COLLECTION = "sentinel-2-l2a";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[fetch-s2-ndvi] Function invoked');
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default: 7 days ago
      endDate = new Date().toISOString().split('T')[0], // Default: today
      cloudCoverage = 20,
      forceRefresh = false,
      maxTilesPerRun = 3, // Limit to 3 tiles to avoid memory issues
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

    // Step 3: Process each tile from STAC (store metadata only to avoid memory issues)
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

        // Extract band URLs from STAC item
        const assets = feature.assets || {};
        const redBandUrl = assets.B04?.href || '';
        const nirBandUrl = assets.B08?.href || '';
        const thumbnailUrl = assets.visual?.href || '';

        if (!redBandUrl || !nirBandUrl) {
          console.warn(`[fetch-s2-ndvi] Missing band URLs for tile ${tileId}`);
          continue;
        }

        // Store metadata instead of downloading full files
        const ndviPath = `${tileId}/${acquisitionDate}/ndvi_metadata.json`;
        const ndviMetadata = {
          tile_id: tileId,
          acquisition_date: acquisitionDate,
          cloud_cover: properties['eo:cloud_cover'] || 0,
          red_band_url: redBandUrl,
          nir_band_url: nirBandUrl,
          thumbnail_url: thumbnailUrl,
          sas_token: sasToken,
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
          status: 'metadata_stored',
          download_scheduled: true
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

        // Prepare tile data
        const tileData = {
          tile_id: tileId,
          acquisition_date: acquisitionDate,
          cloud_cover: properties['eo:cloud_cover'] || 0,
          collection: DEFAULT_COLLECTION,
          red_band_path: null, // Will be populated when downloaded
          nir_band_path: null, // Will be populated when downloaded
          ndvi_path: `satellite-data/${ndviPath}`,
          copernicus_red_band_url: redBandUrl,
          copernicus_nir_band_url: nirBandUrl,
          metadata: ndviMetadata,
          raw_paths: {
            metadata: ndviPath,
            thumbnail: thumbnailUrl
          },
          file_size_mb: 0, // Will be updated when downloaded
          status: 'metadata_stored',
          processing_stage: 'metadata_stored',
          actual_download_status: 'pending',
          storage_verified: false,
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

        results.metadata_stored++;
        results.details.push({
          tile_id: tileId,
          status: 'success',
          message: `Tile metadata stored successfully`,
          acquisition_date: acquisitionDate
        });

        console.log(`[fetch-s2-ndvi] Successfully stored metadata for tile ${tileId}/${acquisitionDate}`);

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

    results.processed = results.inserted + results.updated;
    console.log('[fetch-s2-ndvi] Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Stored metadata for ${results.metadata_stored} tiles, inserted ${results.inserted}, updated ${results.updated}`,
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
    return handleError(error, 500, req);
  }
});