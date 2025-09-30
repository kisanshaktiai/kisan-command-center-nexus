import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { handleError } from "../_shared/errorHandler.ts";
import { processTileDownloads } from "./cog-downloader.ts";

// Microsoft Planetary Computer API endpoints
const PLANETARY_COMPUTER_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1";
const PLANETARY_COMPUTER_SAS_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a";

// Agricultural regions in India (major crop-producing areas)
const AGRICULTURAL_REGIONS = [
  { name: "Punjab", bbox: [73.0, 29.5, 77.0, 32.0] },
  { name: "Haryana", bbox: [74.5, 27.5, 77.5, 30.5] },
  { name: "Western UP", bbox: [77.0, 26.5, 79.0, 30.0] },
  { name: "Maharashtra", bbox: [72.5, 16.0, 79.5, 22.0] },
  { name: "Gujarat", bbox: [68.5, 20.0, 74.5, 24.5] },
  { name: "Karnataka", bbox: [74.0, 12.0, 78.5, 18.0] },
  { name: "Andhra Pradesh", bbox: [77.0, 13.0, 84.5, 19.0] },
  { name: "Tamil Nadu", bbox: [76.5, 8.0, 80.5, 13.5] },
];
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
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      cloudCoverage = 20,
      forceRefresh = false,
      downloadFiles = false, // New flag to control actual file downloads
      regions = AGRICULTURAL_REGIONS.slice(0, 2), // Process first 2 regions by default
    } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[fetch-s2-ndvi] Processing agricultural regions:`, regions.map(r => r.name));

    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      regions_processed: [] as string[],
      details: [] as any[]
    };

    // Step 1: Get SAS token for authentication
    console.log('[fetch-s2-ndvi] Getting SAS token...');
    const sasResponse = await fetch(PLANETARY_COMPUTER_SAS_URL);
    const sasData = await sasResponse.json();
    const sasToken = sasData.token;

    // Step 2: Process each agricultural region
    for (const region of regions) {
      console.log(`[fetch-s2-ndvi] Processing region: ${region.name}`);
      
      try {
        // Search for tiles in this region
        const searchPayload = {
          collections: ["sentinel-2-l2a"],
          bbox: region.bbox,
          datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
          query: {
            "eo:cloud_cover": { "lt": cloudCoverage }
          },
          limit: 2, // Limit tiles per region to keep it light
          sortby: [
            { field: "properties.datetime", direction: "desc" }
          ]
        };

        const stacResponse = await fetch(`${PLANETARY_COMPUTER_STAC_URL}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchPayload)
        });

        if (!stacResponse.ok) {
          console.error(`[fetch-s2-ndvi] Failed to fetch tiles for ${region.name}`);
          continue;
        }

        const stacData = await stacResponse.json();
        console.log(`[fetch-s2-ndvi] Found ${stacData.features?.length || 0} tiles in ${region.name}`);

        // Process each tile
        for (const feature of stacData.features || []) {
          const properties = feature.properties || {};
          const tileId = properties['s2:mgrs_tile'] || 'UNKNOWN';
          const acquisitionDate = properties.datetime ? 
            new Date(properties.datetime).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0];

          console.log(`[fetch-s2-ndvi] Processing tile ${tileId} from ${acquisitionDate}`);

          // Check if tile already exists
          const { data: existingTile } = await supabase
            .from('satellite_tiles')
            .select('id, status, actual_download_status, red_band_path, nir_band_path')
            .eq('tile_id', tileId)
            .eq('acquisition_date', acquisitionDate)
            .single();

          // Skip only if tile exists, has files, and forceRefresh is false
          if (existingTile && !forceRefresh) {
            if (existingTile.red_band_path && existingTile.nir_band_path && 
                existingTile.actual_download_status === 'completed') {
              console.log(`[fetch-s2-ndvi] Tile ${tileId} already fully processed, skipping...`);
              continue;
            }
            console.log(`[fetch-s2-ndvi] Tile ${tileId} exists but needs processing`);
          }

          // Extract band URLs
          const assets = feature.assets || {};
          const redBandUrl = assets.B04?.href || '';
          const nirBandUrl = assets.B08?.href || '';
          const thumbnailUrl = assets.visual?.href || '';

          if (!redBandUrl || !nirBandUrl) {
            console.warn(`[fetch-s2-ndvi] Missing band URLs for tile ${tileId}`);
            results.errors++;
            continue;
          }

          // Create metadata object
          const metadata = {
            tile_id: tileId,
            acquisition_date: acquisitionDate,
            region: region.name,
            cloud_cover: properties['eo:cloud_cover'] || 0,
            red_band_url: redBandUrl + '?' + sasToken,
            nir_band_url: nirBandUrl + '?' + sasToken,
            thumbnail_url: thumbnailUrl ? thumbnailUrl + '?' + sasToken : null,
            processing_timestamp: new Date().toISOString(),
            scene_id: feature.id,
            product_id: properties['s2:product_id'],
            geometry: feature.geometry,
            bbox: feature.bbox
          };

          // Prepare initial tile data
          let tileData = {
            tile_id: tileId,
            acquisition_date: acquisitionDate,
            cloud_cover: properties['eo:cloud_cover'] || 0,
            collection: "sentinel-2-l2a",
            red_band_path: existingTile?.red_band_path || null,
            nir_band_path: existingTile?.nir_band_path || null,
            ndvi_path: null,
            copernicus_red_band_url: redBandUrl,
            copernicus_nir_band_url: nirBandUrl,
            metadata: metadata,
            raw_paths: {
              region: region.name,
              thumbnail: thumbnailUrl
            },
            file_size_mb: 0,
            status: 'ready_for_processing',
            processing_stage: 'metadata_stored',
            actual_download_status: 'not_started',
            storage_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Download actual TIFF files if requested
          if (downloadFiles || forceRefresh) {
            console.log(`[fetch-s2-ndvi] Downloading TIFF files for tile ${tileId}`);
            
            const downloadResult = await processTileDownloads({
              tile_id: tileId,
              acquisition_date: acquisitionDate,
              metadata: metadata,
              copernicus_red_band_url: redBandUrl + '?' + sasToken,
              copernicus_nir_band_url: nirBandUrl + '?' + sasToken
            }, supabase);

            if (downloadResult.success) {
              tileData.red_band_path = downloadResult.redBandPath || null;
              tileData.nir_band_path = downloadResult.nirBandPath || null;
              tileData.actual_download_status = 'completed';
              tileData.processing_stage = 'bands_downloaded';
              tileData.status = 'processing';
              tileData.storage_verified = true;
              
              console.log(`[fetch-s2-ndvi] Successfully downloaded bands for ${tileId}`);
            } else {
              console.error(`[fetch-s2-ndvi] Failed to download bands for ${tileId}:`, downloadResult.error);
              tileData.actual_download_status = 'failed';
              tileData.status = 'error';
              results.errors++;
            }
          }

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

          results.details.push({
            tile_id: tileId,
            region: region.name,
            status: 'success',
            acquisition_date: acquisitionDate
          });

          console.log(`[fetch-s2-ndvi] Successfully processed tile ${tileId} for ${region.name}`);
        }

        results.regions_processed.push(region.name);
      } catch (error) {
        console.error(`[fetch-s2-ndvi] Error processing region ${region.name}:`, error);
        results.errors++;
      }
    }

    results.processed = results.inserted + results.updated;
    console.log('[fetch-s2-ndvi] Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.regions_processed.length} agricultural regions: ${results.inserted} new tiles, ${results.updated} updated`,
        results,
        metadata: {
          timestamp: new Date().toISOString(),
          regions: results.regions_processed,
          date_range: { start: startDate, end: endDate }
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[fetch-s2-ndvi] Function error:', error);
    return handleError(error, 500, req);
  }
});