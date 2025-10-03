import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[mark-agricultural-tiles] Starting agricultural tile detection');

    // Get all lands with boundaries (boundary is geometry type, not JSONB)
    const { data: lands, error: landsError } = await supabase
      .from('lands')
      .select('id, boundary')
      .not('boundary', 'is', null);

    if (landsError) {
      console.error('[mark-agricultural-tiles] Error fetching lands:', landsError);
      throw landsError;
    }

    console.log(`[mark-agricultural-tiles] Found ${lands?.length || 0} lands to process`);

    if (!lands || lands.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            total_lands: 0,
            processed_lands: 0,
            marked_tiles: [],
            marked_tiles_count: 0,
            created_satellite_tiles: [],
            errors: []
          },
          message: 'No lands with boundaries found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markedTiles = new Set<string>();
    const createdSatTiles: string[] = [];
    let processedLands = 0;
    const errors: any[] = [];

    for (const land of lands || []) {
      try {
        console.log(`[mark-agricultural-tiles] Processing land ${land.id}`);
        
        // Calculate land area in km² from geometry
        const { data: areaData, error: areaError } = await supabase
          .rpc('calculate_area_km2', { geom: land.boundary });
        
        if (areaError) {
          console.error(`[mark-agricultural-tiles] Error calculating area for land ${land.id}:`, areaError);
          errors.push({ land_id: land.id, error: areaError.message });
          continue;
        }

        const landAreaKm2 = areaData || 0;
        
        // Find MGRS tile containing this land
        const { data: containingTiles, error: tileError } = await supabase
          .rpc('find_mgrs_tile_for_land', { land_geom: land.boundary });

        if (tileError) {
          console.error(`[mark-agricultural-tiles] Error finding tile for land ${land.id}:`, tileError);
          errors.push({ land_id: land.id, error: tileError.message });
          continue;
        }

        if (containingTiles && containingTiles.length > 0) {
          const mgrsTile = containingTiles[0];
          
          console.log(`[mark-agricultural-tiles] Land ${land.id} -> MGRS tile ${mgrsTile.tile_id} (${landAreaKm2.toFixed(4)} km²)`);

          // Use RPC function to properly mark tile and increment counts
          const { error: markError } = await supabase
            .rpc('mark_agricultural_tile', {
              p_tile_id: mgrsTile.tile_id,
              p_land_area_km2: landAreaKm2
            });

          if (markError) {
            console.error(`[mark-agricultural-tiles] Error marking tile ${mgrsTile.tile_id}:`, markError);
            errors.push({ land_id: land.id, tile_id: mgrsTile.tile_id, error: markError.message });
          } else {
            markedTiles.add(mgrsTile.tile_id);
          }

          // Ensure satellite_tile record exists
          const { data: existingSatTile } = await supabase
            .from('satellite_tiles')
            .select('id')
            .eq('tile_id', mgrsTile.tile_id)
            .eq('acquisition_date', new Date().toISOString().split('T')[0])
            .maybeSingle();

          if (!existingSatTile) {
            const { error: satTileError } = await supabase
              .from('satellite_tiles')
              .insert({
                tile_id: mgrsTile.tile_id,
                mgrs_tile_id: mgrsTile.id,
                status: 'pending',
                data_source: 'copernicus',
                acquisition_date: new Date().toISOString().split('T')[0],
                collection: 'SENTINEL-2'
              });

            if (satTileError) {
              console.error(`[mark-agricultural-tiles] Error creating satellite tile:`, satTileError);
            } else {
              createdSatTiles.push(mgrsTile.tile_id);
            }
          }

          processedLands++;
        } else {
          console.warn(`[mark-agricultural-tiles] No MGRS tile found for land ${land.id}`);
          errors.push({ land_id: land.id, error: 'No containing MGRS tile found' });
        }
      } catch (error: any) {
        console.error(`[mark-agricultural-tiles] Error processing land ${land.id}:`, error);
        errors.push({ land_id: land.id, error: error.message });
      }
    }

    const result = {
      success: true,
      data: {
        total_lands: lands?.length || 0,
        processed_lands: processedLands,
        marked_tiles: Array.from(markedTiles),
        marked_tiles_count: markedTiles.size,
        created_satellite_tiles: createdSatTiles,
        errors
      },
      message: `Successfully marked ${markedTiles.size} MGRS tiles as agricultural from ${processedLands} lands`
    };

    console.log('[mark-agricultural-tiles] Complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mark-agricultural-tiles] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
