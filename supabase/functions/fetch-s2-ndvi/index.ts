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

    // Get active countries (using correct code 'IND' instead of 'IN')
    const { data: countries, error: countryError } = await supabase
      .from("countries")
      .select("*")
      .eq("is_active", true);

    if (countryError) {
      console.error("[fetch-s2-ndvi] Error fetching countries:", countryError);
      throw new Error(`Failed to fetch countries: ${countryError.message}`);
    }

    console.log(`[fetch-s2-ndvi] Found ${countries?.length || 0} active countries`);

    // Mock satellite data for demonstration
    const mockTiles = generateMockSatelliteTiles(countries || [], startDateTime, endDateTime);
    
    // Insert or update satellite tiles
    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: []
    };

    for (const tile of mockTiles) {
      try {
        // Check if tile already exists
        const { data: existingTile } = await supabase
          .from("satellite_tiles")
          .select("id, status")
          .eq("tile_id", tile.tile_id)
          .eq("acquisition_date", tile.acquisition_date)
          .single();

        if (existingTile && !forceRefresh) {
          console.log(`[fetch-s2-ndvi] Tile ${tile.tile_id} already exists, skipping`);
          results.processed++;
          continue;
        }

        // Process NDVI calculation (mock)
        const processedTile = await processSatelliteTile(tile);

        // Insert or update the tile
        const { error: upsertError } = await supabase
          .from("satellite_tiles")
          .upsert({
            ...processedTile,
            updated_at: new Date().toISOString()
          }, {
            onConflict: "tile_id,acquisition_date"
          });

        if (upsertError) {
          console.error(`[fetch-s2-ndvi] Error upserting tile ${tile.tile_id}:`, upsertError);
          results.errors.push({ tile_id: tile.tile_id, error: upsertError.message });
        } else {
          if (existingTile) {
            results.updated++;
          } else {
            results.inserted++;
          }
          results.processed++;
        }
      } catch (error) {
        console.error(`[fetch-s2-ndvi] Error processing tile ${tile.tile_id}:`, error);
        results.errors.push({ tile_id: tile.tile_id, error: String(error) });
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

// Helper function to generate mock satellite tiles
function generateMockSatelliteTiles(countries: any[], startDate: string, endDate: string) {
  const tiles = [];
  const tileIds = ["42QVK", "43PCP", "44QKD", "45RVH", "46SED"];
  const statuses = ["ready", "pending", "error"];
  
  for (const country of countries) {
    for (let i = 0; i < 5; i++) {
      const acquisitionDate = new Date(
        new Date(startDate).getTime() + 
        Math.random() * (new Date(endDate).getTime() - new Date(startDate).getTime())
      );
      
      tiles.push({
        tile_id: tileIds[Math.floor(Math.random() * tileIds.length)],
        acquisition_date: acquisitionDate.toISOString().split('T')[0],
        cloud_cover: Math.random() * 30,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        country_id: country.id,
        collection: "sentinel-2-l2a",
        processing_level: "L2A",
        red_band_path: `https://dummy/red_${i}.tif`,
        nir_band_path: `https://dummy/nir_${i}.tif`,
        metadata: {
          processing_version: "1.0.0",
          algorithm: "NDVI",
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  return tiles;
}

// Mock NDVI processing
async function processSatelliteTile(tile: any) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate NDVI path
  const ndviPath = `${tile.tile_id}/${tile.acquisition_date}/ndvi.tif`;
  
  // Randomly assign success or error
  const isSuccess = Math.random() > 0.1;
  
  return {
    ...tile,
    status: isSuccess ? "completed" : "error",
    ndvi_path: isSuccess ? ndviPath : null,
    file_size_mb: isSuccess ? (Math.random() * 100 + 10).toFixed(2) : null,
    error_message: isSuccess ? null : "Mock processing error",
    checksum: isSuccess ? generateChecksum() : null,
    raw_paths: [tile.red_band_path, tile.nir_band_path]
  };
}

function generateChecksum() {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}