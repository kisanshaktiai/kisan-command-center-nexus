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

    // Get all lands with boundaries
    const { data: lands, error: landsError } = await supabase
      .from('lands')
      .select('id, boundary, area, farmer_id');

    if (landsError) {
      throw landsError;
    }

    console.log(`[mark-agricultural-tiles] Found ${lands?.length || 0} lands to process`);

    const markedTiles = new Set<string>();
    const createdSatTiles: string[] = [];
    let processedLands = 0;
    const errors: any[] = [];

    for (const land of lands || []) {
      try {
        // Find which MGRS tile contains this land
        const { data: containingTiles, error: tileError } = await supabase
          .rpc('find_mgrs_tile_for_land', { land_geom: land.boundary });

        if (tileError) {
          console.error(`[mark-agricultural-tiles] Error finding tile for land ${land.id}:`, tileError);
          errors.push({ land_id: land.id, error: tileError.message });
          continue;
        }

        if (containingTiles && containingTiles.length > 0) {
          const mgrsTile = containingTiles[0];
          
          console.log(`[mark-agricultural-tiles] Land ${land.id} -> MGRS tile ${mgrsTile.tile_id}`);

          // Mark MGRS tile as agricultural
          const { error: updateError } = await supabase
            .from('mgrs_tiles')
            .update({ is_agri: true })
            .eq('id', mgrsTile.id);

          if (updateError) {
            console.error(`[mark-agricultural-tiles] Error marking tile ${mgrsTile.tile_id}:`, updateError);
            errors.push({ land_id: land.id, tile_id: mgrsTile.tile_id, error: updateError.message });
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
