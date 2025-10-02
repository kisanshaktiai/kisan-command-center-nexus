import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

// Microsoft Planetary Computer API endpoints
const PLANETARY_COMPUTER_URL = 'https://planetarycomputer.microsoft.com/api';
const STAC_API_URL = `${PLANETARY_COMPUTER_URL}/stac/v1`;
const SAS_TOKEN_URL = `${PLANETARY_COMPUTER_URL}/sas/v1/token/sentinel-2-l2a`;

// Smaller test regions for lightweight processing
const AGRICULTURAL_REGIONS = {
  'Punjab': { west: 75.0, south: 30.5, east: 75.5, north: 31.0 },  // Very small area
  'Haryana': { west: 76.5, south: 29.0, east: 77.0, north: 29.5 }  // Very small area
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[fetch-s2-ndvi-lite] Function invoked - LIGHTWEIGHT VERSION');
    
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      cloudCoverage = 20,
      regions = ['Punjab'] // Process only one region at a time
    } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: [],
      regions_processed: [],
      tiles: []
    };

    // Get SAS token for authentication
    console.log('[fetch-s2-ndvi-lite] Getting SAS token...');
    let sasToken = '';
    try {
      const sasResponse = await fetch(SAS_TOKEN_URL);
      const sasData = await sasResponse.json();
      sasToken = sasData.token || '';
    } catch (error) {
      console.log('[fetch-s2-ndvi-lite] SAS token fetch failed, continuing without it');
    }

    // Process each region
    for (const regionName of regions) {
      const region = AGRICULTURAL_REGIONS[regionName];
      if (!region) {
        console.log(`[fetch-s2-ndvi-lite] Region ${regionName} not found`);
        continue;
      }

      console.log(`[fetch-s2-ndvi-lite] Processing region: ${regionName} with bbox:`, region);
      
      try {
        // Search for tiles - using R60m resolution for lightweight processing
        const searchPayload = {
          collections: ["sentinel-2-l2a"],
          bbox: [region.west, region.south, region.east, region.north],
          datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
          query: {
            "eo:cloud_cover": { "lt": cloudCoverage }
          },
          limit: 1, // Only 1 tile per region for lightweight processing
          sortby: [
            { field: "properties.datetime", direction: "desc" }
          ]
        };

        console.log('[fetch-s2-ndvi-lite] Searching for tiles with payload:', searchPayload);

        const stacResponse = await fetch(`${STAC_API_URL}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchPayload)
        });

        if (!stacResponse.ok) {
          const errorText = await stacResponse.text();
          console.error(`[fetch-s2-ndvi-lite] STAC search failed for ${regionName}:`, errorText);
          results.errors.push({ region: regionName, error: 'STAC search failed' });
          continue;
        }

        const stacData = await stacResponse.json();
        console.log(`[fetch-s2-ndvi-lite] Found ${stacData.features?.length || 0} tiles in ${regionName}`);

        // Process each tile (metadata only)
        for (const feature of stacData.features || []) {
          const properties = feature.properties || {};
          const tileId = properties['s2:mgrs_tile'] || 'UNKNOWN';
          const acquisitionDate = properties.datetime ? 
            new Date(properties.datetime).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0];

          console.log(`[fetch-s2-ndvi-lite] Processing tile metadata for ${tileId}`);

          // Extract URLs for different resolutions (we'll use R60m for lightweight processing)
          const assets = feature.assets || {};
          
          // R60m bands (lowest resolution, smallest files)
          const redBand60mUrl = assets.B04?.href?.replace('/R10m/', '/R60m/').replace('_10m', '_60m') || '';
          const nirBand60mUrl = assets.B08?.href?.replace('/R10m/', '/R60m/').replace('_10m', '_60m') || '';
          
          // R20m bands (medium resolution)
          const redBand20mUrl = assets.B04?.href?.replace('/R10m/', '/R20m/').replace('_10m', '_20m') || '';
          const nirBand20mUrl = assets.B08?.href?.replace('/R10m/', '/R20m/').replace('_10m', '_20m') || '';
          
          // Original R10m bands (keep as reference but don't download)
          const redBand10mUrl = assets.B04?.href || '';
          const nirBand10mUrl = assets.B08?.href || '';
          
          const thumbnailUrl = assets.visual?.href || '';

          // Prepare lightweight metadata
          const metadata = {
            tile_id: tileId,
            acquisition_date: acquisitionDate,
            region: regionName,
            cloud_cover: properties['eo:cloud_cover'] || 0,
            scene_id: feature.id,
            product_id: properties['s2:product_id'],
            processing_level: properties['s2:processing_level'] || 'L2A',
            // Store URLs for all resolutions
            band_urls: {
              R60m: {
                red: redBand60mUrl ? redBand60mUrl + (sasToken ? '?' + sasToken : '') : null,
                nir: nirBand60mUrl ? nirBand60mUrl + (sasToken ? '?' + sasToken : '') : null
              },
              R20m: {
                red: redBand20mUrl ? redBand20mUrl + (sasToken ? '?' + sasToken : '') : null,
                nir: nirBand20mUrl ? nirBand20mUrl + (sasToken ? '?' + sasToken : '') : null
              },
              R10m: {
                red: redBand10mUrl ? redBand10mUrl + (sasToken ? '?' + sasToken : '') : null,
                nir: nirBand10mUrl ? nirBand10mUrl + (sasToken ? '?' + sasToken : '') : null
              }
            },
            thumbnail_url: thumbnailUrl ? thumbnailUrl + (sasToken ? '?' + sasToken : '') : null,
            geometry: feature.geometry,
            bbox: feature.bbox,
            data_size_estimate_mb: {
              R60m: 2,  // ~2MB per band at 60m resolution
              R20m: 20, // ~20MB per band at 20m resolution  
              R10m: 80  // ~80MB per band at 10m resolution
            }
          };

          // Check if tile already exists
          const { data: existingTile } = await supabase
            .from('satellite_tiles')
            .select('id')
            .eq('tile_id', tileId)
            .eq('acquisition_date', acquisitionDate)
            .single();

          // Prepare tile data (metadata only, no downloads)
          const tileData = {
            tile_id: tileId,
            acquisition_date: acquisitionDate,
            cloud_cover: properties['eo:cloud_cover'] || 0,
            collection: "sentinel-2-l2a",
            // Store R60m URLs as the primary bands for lightweight processing
            copernicus_red_band_url: redBand60mUrl ? redBand60mUrl + (sasToken ? '?' + sasToken : '') : null,
            copernicus_nir_band_url: nirBand60mUrl ? nirBand60mUrl + (sasToken ? '?' + sasToken : '') : null,
            metadata: metadata,
            raw_paths: {
              region: regionName,
              thumbnail: thumbnailUrl,
              resolution: 'R60m'
            },
            file_size_mb: 4,
            status: 'metadata_only',
            processing_stage: 'metadata_stored',
            processing_method: 'metadata_fetch',
            actual_download_status: 'not_required',
            storage_verified: false,
            data_source: 'planetary_computer',
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
              console.error(`[fetch-s2-ndvi-lite] Failed to update tile:`, updateError);
              results.errors.push({ tile: tileId, error: updateError.message });
              continue;
            }
            results.updated++;
          } else {
            const { error: insertError } = await supabase
              .from('satellite_tiles')
              .insert(tileData);

            if (insertError) {
              console.error(`[fetch-s2-ndvi-lite] Failed to insert tile:`, insertError);
              results.errors.push({ tile: tileId, error: insertError.message });
              continue;
            }
            results.inserted++;
          }

          results.tiles.push({
            tile_id: tileId,
            region: regionName,
            acquisition_date: acquisitionDate,
            cloud_cover: properties['eo:cloud_cover'],
            resolution: 'R60m',
            status: 'metadata_ready'
          });

          console.log(`[fetch-s2-ndvi-lite] Successfully stored metadata for tile ${tileId}`);
        }

        results.regions_processed.push(regionName);
      } catch (error) {
        console.error(`[fetch-s2-ndvi-lite] Error processing region ${regionName}:`, error);
        results.errors.push({ region: regionName, error: error.message });
      }
    }

    results.processed = results.inserted + results.updated;
    console.log('[fetch-s2-ndvi-lite] Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Lightweight processing completed for ${results.regions_processed.length} regions`,
        results,
        note: 'Using R60m resolution for efficient processing. Tiles contain metadata only, no file downloads.'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[fetch-s2-ndvi-lite] Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: 'Lightweight NDVI fetch failed'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
