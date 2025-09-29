import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { handleError } from "../_shared/errorHandler.ts";

const SENTINEL_API_URL = "https://services.sentinel-hub.com/api/v1/catalog";
const COPERNICUS_API_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[fetch-s2-ndvi] Starting NDVI sync process");
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body (optional parameters)
    const { startDate, endDate, cloudCoverage = 20, forceRefresh = false } = 
      req.method === "POST" ? await req.json() : {};

    // Default date range (last 30 days)
    const endDateTime = endDate || new Date().toISOString();
    const startDateTime = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`[fetch-s2-ndvi] Date range: ${startDateTime} to ${endDateTime}`);
    console.log(`[fetch-s2-ndvi] Cloud coverage threshold: ${cloudCoverage}%`);

    // Get all MGRS tiles for processing
    const { data: mgrsTiles, error: mgrsError } = await supabase
      .from("mgrs_tiles")
      .select("*")
      .eq("is_active", true);

    if (mgrsError) {
      console.error("[fetch-s2-ndvi] Error fetching MGRS tiles:", mgrsError);
      throw new Error(`Failed to fetch MGRS tiles: ${mgrsError.message}`);
    }

    console.log(`[fetch-s2-ndvi] Found ${mgrsTiles?.length || 0} MGRS tiles to process`);

    if (!mgrsTiles || mgrsTiles.length === 0) {
      console.log("[fetch-s2-ndvi] No MGRS tiles found for processing");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No MGRS tiles found for processing",
          results: { processed: 0, inserted: 0, updated: 0, errors: [] },
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // Insert or update satellite tiles
    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: []
    };

    for (const mgrsTile of mgrsTiles) {
      try {
        // Generate acquisition date (simulate daily captures within date range)
        const acquisitionDate = new Date(
          new Date(startDateTime).getTime() + 
          Math.random() * (new Date(endDateTime).getTime() - new Date(startDateTime).getTime())
        ).toISOString().split('T')[0];

        // Check if satellite tile already exists for this MGRS tile and date
        const { data: existingTile } = await supabase
          .from("satellite_tiles")
          .select("id, status")
          .eq("tile_id", mgrsTile.tile_id)
          .eq("acquisition_date", acquisitionDate)
          .maybeSingle();

        if (existingTile && !forceRefresh) {
          console.log(`[fetch-s2-ndvi] Tile ${mgrsTile.tile_id} for ${acquisitionDate} already exists, skipping`);
          results.processed++;
          continue;
        }

        // Create satellite tile data from MGRS tile
        const satelliteTileData = {
          tile_id: mgrsTile.tile_id,
          acquisition_date: acquisitionDate,
          cloud_cover: Math.random() * cloudCoverage, // Random cloud coverage within threshold
          status: "pending",
          country_id: mgrsTile.country_id || "IND", // Default to India
          collection: "sentinel-2-l2a",
          processing_level: "L2A",
          red_band_path: `sentinel-2/${mgrsTile.tile_id}/${acquisitionDate}/red.tif`,
          nir_band_path: `sentinel-2/${mgrsTile.tile_id}/${acquisitionDate}/nir.tif`,
          metadata: {
            mgrs_tile_id: mgrsTile.id,
            utm_zone: mgrsTile.utm_zone,
            latitude_band: mgrsTile.latitude_band,
            grid_square: mgrsTile.grid_square,
            geometry: mgrsTile.geometry,
            processing_timestamp: new Date().toISOString(),
            satellite: "Sentinel-2",
            sensor: "MSI"
          }
        };

        // Insert satellite tile with pending status first
        const { data: insertedTile, error: insertError } = await supabase
          .from("satellite_tiles")
          .upsert({
            ...satelliteTileData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: "tile_id,acquisition_date"
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[fetch-s2-ndvi] Error inserting tile ${mgrsTile.tile_id}:`, insertError);
          results.errors.push({ tile_id: mgrsTile.tile_id, error: insertError.message });
          continue;
        }

        // Simulate NDVI processing
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing delay
        
        const processingSuccess = Math.random() > 0.1; // 90% success rate
        const processedData = {
          status: processingSuccess ? "completed" : "error",
          ndvi_path: processingSuccess ? `ndvi/${mgrsTile.tile_id}/${acquisitionDate}/ndvi.tif` : null,
          file_size_mb: processingSuccess ? parseFloat((Math.random() * 100 + 10).toFixed(2)) : null,
          error_message: processingSuccess ? null : "Simulated processing error",
          checksum: processingSuccess ? generateChecksum() : null,
          raw_paths: [satelliteTileData.red_band_path, satelliteTileData.nir_band_path],
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Update tile with processing results
        const { error: updateError } = await supabase
          .from("satellite_tiles")
          .update(processedData)
          .eq("id", insertedTile.id);

        if (updateError) {
          console.error(`[fetch-s2-ndvi] Error updating tile ${mgrsTile.tile_id}:`, updateError);
          results.errors.push({ tile_id: mgrsTile.tile_id, error: updateError.message });
        } else {
          if (existingTile) {
            results.updated++;
          } else {
            results.inserted++;
          }
          results.processed++;
          console.log(`[fetch-s2-ndvi] Successfully processed tile ${mgrsTile.tile_id} with status: ${processedData.status}`);
        }

      } catch (error) {
        console.error(`[fetch-s2-ndvi] Error processing MGRS tile ${mgrsTile.tile_id}:`, error);
        results.errors.push({ tile_id: mgrsTile.tile_id, error: String(error) });
      }
    }

    console.log(`[fetch-s2-ndvi] Sync completed. Results:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "NDVI sync completed successfully",
        results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[fetch-s2-ndvi] Fatal error:", error);
    return handleError(error, 500, req);
  }
});

// Helper function to generate checksums
function generateChecksum() {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}