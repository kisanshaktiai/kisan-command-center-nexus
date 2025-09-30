import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Microsoft Planetary Computer API endpoints
const PLANETARY_COMPUTER_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1";
const PLANETARY_COMPUTER_SAS_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a";

// Default search parameters
const DEFAULT_BBOX = [72.0, 18.0, 88.0, 28.0]; // India bounding box (simplified)
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
      details: [] as any[]
    };

    // Step 1: Fetch available tiles from STAC API
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

    // Step 2: Process each tile from STAC
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

        if (!redBandUrl || !nirBandUrl) {
          console.warn(`[fetch-s2-ndvi] Missing band URLs for tile ${tileId}`);
          continue;
        }

        // Prepare tile data
        const tileData = {
          tile_id: tileId,
          acquisition_date: acquisitionDate,
          cloud_cover: properties['eo:cloud_cover'] || 0,
          country: 'India', // Default for now
          data_source: 'sentinel-2',
          red_band_url: redBandUrl,
          nir_band_url: nirBandUrl,
          metadata: {
            stac_id: feature.id,
            collection: feature.collection,
            geometry: feature.geometry,
            properties: properties
          },
          status: 'pending',
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

        results.details.push({
          tile_id: tileId,
          status: 'success',
          message: existingTile ? 'Tile updated' : 'Tile inserted'
        });

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

    // Step 3: Process pending tiles (simplified for now - just mark as completed)
    const { data: pendingTiles } = await supabase
      .from('satellite_tiles')
      .select('*')
      .eq('status', 'pending')
      .limit(5);

    for (const tile of pendingTiles || []) {
      try {
        console.log(`[fetch-s2-ndvi] Processing pending tile ${tile.tile_id}`);
        
        // For now, create simple metadata
        const metadata = {
          tile_id: tile.tile_id,
          acquisition_date: tile.acquisition_date,
          cloud_cover: tile.cloud_cover,
          processed_at: new Date().toISOString(),
          status: 'completed',
          message: 'Tile metadata processed'
        };

        // Store metadata as JSON in storage
        const metadataPath = `${tile.tile_id}/${tile.acquisition_date}/metadata.json`;
        const metadataContent = JSON.stringify(metadata, null, 2);
        
        const { error: uploadError } = await supabase.storage
          .from('satellite-data')
          .upload(metadataPath, metadataContent, {
            contentType: 'application/json',
            upsert: true
          });

        if (uploadError) {
          console.error(`[fetch-s2-ndvi] Failed to upload metadata:`, uploadError);
          
          // Update tile status to error
          await supabase
            .from('satellite_tiles')
            .update({
              status: 'error',
              error_message: uploadError.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', tile.id);
          
          results.errors++;
          continue;
        }

        // Update tile status to completed
        await supabase
          .from('satellite_tiles')
          .update({
            status: 'completed',
            ndvi_path: metadataPath,
            processing_metadata: metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', tile.id);

        results.processed++;
        results.metadata_stored++;

      } catch (error) {
        console.error(`[fetch-s2-ndvi] Error processing tile ${tile.tile_id}:`, error);
        results.errors++;
      }
    }

    console.log('[fetch-s2-ndvi] Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} tiles, inserted ${results.inserted} new tiles`,
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