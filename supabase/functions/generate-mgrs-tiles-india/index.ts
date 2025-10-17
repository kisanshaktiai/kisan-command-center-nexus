import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[generate-mgrs-tiles-india] Starting MGRS tile generation for India');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // India bounding box [minLon, minLat, maxLon, maxLat]
    const indiaBbox = [68.1766, 6.7535, 97.4025, 35.5087];
    const STAC_API_URL = 'https://planetarycomputer.microsoft.com/api/stac/v1';

    let allTiles = new Map<string, any>(); // tileId -> { geometry, properties }
    let totalFetched = 0;
    let page = 1;

    console.log('[generate-mgrs-tiles-india] Querying Microsoft Planetary Computer STAC API');

    // Pagination loop to fetch all tiles
    while (true) {
      const searchResponse = await fetch(`${STAC_API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collections: ['sentinel-2-l2a'],
          bbox: indiaBbox,
          limit: 250, // Max per request
          fields: {
            include: ['id', 'geometry', 'properties.s2:mgrs_tile'],
            exclude: ['assets', 'links']
          }
        })
      });

      if (!searchResponse.ok) {
        throw new Error(`STAC API error: ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      const features = searchData.features || [];
      
      console.log(`[generate-mgrs-tiles-india] Page ${page}: Fetched ${features.length} STAC items`);

      if (features.length === 0) break;

      // Extract unique MGRS tiles
      for (const feature of features) {
        const tileId = feature.properties?.['s2:mgrs_tile'];
        if (tileId && !allTiles.has(tileId)) {
          allTiles.set(tileId, {
            geometry: feature.geometry,
            bbox: feature.bbox
          });
        }
      }

      totalFetched += features.length;

      // Check if there are more pages
      if (features.length < 250) break;
      
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 50) {
        console.warn('[generate-mgrs-tiles-india] Reached page limit, stopping');
        break;
      }
    }

    console.log(`[generate-mgrs-tiles-india] Total STAC items fetched: ${totalFetched}`);
    console.log(`[generate-mgrs-tiles-india] Unique MGRS tiles identified: ${allTiles.size}`);

    // Get India country ID
    const { data: indiaCountry } = await supabase
      .from('countries')
      .select('id')
      .eq('name', 'India')
      .single();

    const countryId = indiaCountry?.id;

    let inserted = 0;
    let errors = 0;
    const errorLog: string[] = [];

    // Process each tile
    for (const [tileId, tileData] of allTiles.entries()) {
      try {
        // Convert GeoJSON geometry to WKT format for PostGIS
        const geojsonGeometry = tileData.geometry;
        
        // Call find_intersecting_states function
        const { data: stateData, error: stateError } = await supabase
          .rpc('find_intersecting_states', { 
            tile_geom: `SRID=4326;${JSON.stringify(geojsonGeometry)}` 
          });

        if (stateError) {
          console.error(`[generate-mgrs-tiles-india] State intersection error for ${tileId}:`, stateError);
          errorLog.push(`${tileId}: State intersection failed - ${stateError.message}`);
          errors++;
          continue;
        }

        // Call find_intersecting_districts function
        const { data: districtData, error: districtError } = await supabase
          .rpc('find_intersecting_districts', { 
            tile_geom: `SRID=4326;${JSON.stringify(geojsonGeometry)}` 
          });

        if (districtError) {
          console.error(`[generate-mgrs-tiles-india] District intersection error for ${tileId}:`, districtError);
          errorLog.push(`${tileId}: District intersection failed - ${districtError.message}`);
          errors++;
          continue;
        }

        const state = stateData && stateData.length > 0 ? stateData[0] : null;
        const district = districtData && districtData.length > 0 ? districtData[0] : null;

        // Calculate approximate area (100km x 100km for MGRS tiles)
        const totalAreaKm2 = 10000;

        // Insert tile into mgrs_tiles table
        const { error: insertError } = await supabase.from('mgrs_tiles').insert({
          tile_id: tileId,
          geometry: `SRID=4326;${JSON.stringify(geojsonGeometry)}`,
          geojson_geometry: geojsonGeometry,
          state: state?.name || null,
          state_id: state?.id || null,
          district: district?.name || null,
          district_id: district?.id || null,
          country_id: countryId,
          total_area_km2: totalAreaKm2,
          is_agri: false,
          is_land_contain: false,
          is_ndvi_ready: false,
          total_lands_count: 0,
          agri_area_km2: 0
        });

        if (insertError) {
          console.error(`[generate-mgrs-tiles-india] Insert error for ${tileId}:`, insertError);
          errorLog.push(`${tileId}: Insert failed - ${insertError.message}`);
          errors++;
        } else {
          inserted++;
          
          // Log progress every 50 tiles
          if (inserted % 50 === 0) {
            console.log(`[generate-mgrs-tiles-india] Progress: ${inserted}/${allTiles.size} tiles inserted`);
          }
        }
      } catch (tileError: any) {
        console.error(`[generate-mgrs-tiles-india] Error processing tile ${tileId}:`, tileError);
        errorLog.push(`${tileId}: ${tileError.message}`);
        errors++;
      }
    }

    console.log(`[generate-mgrs-tiles-india] Completed: ${inserted} tiles inserted, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `MGRS tile generation completed for India`,
        stats: {
          total_stac_items: totalFetched,
          unique_tiles_found: allTiles.size,
          tiles_inserted: inserted,
          errors: errors
        },
        error_log: errorLog.slice(0, 20) // Return first 20 errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('[generate-mgrs-tiles-india] Fatal error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
