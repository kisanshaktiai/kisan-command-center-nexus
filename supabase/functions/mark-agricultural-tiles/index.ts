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
    
    // Generate execution ID for progress tracking
    const executionId = crypto.randomUUID();

    console.log('[mark-agricultural-tiles] Starting agricultural tile detection', { executionId });

    // Initialize progress tracking
    await supabase
      .from('tile_marking_progress')
      .insert({
        execution_id: executionId,
        status: 'running',
        current_step: 'Fetching lands with boundaries...'
      });

    // Get all lands with boundaries (boundary is geometry type, not JSONB)
    const { data: lands, error: landsError } = await supabase
      .from('lands')
      .select('id, boundary')
      .not('boundary', 'is', null);

    if (landsError) {
      console.error('[mark-agricultural-tiles] Error fetching lands:', landsError);
      await supabase
        .from('tile_marking_progress')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: JSON.stringify([{ error: landsError.message }])
        })
        .eq('execution_id', executionId);
      throw landsError;
    }

    const totalLands = lands?.length || 0;
    console.log(`[mark-agricultural-tiles] Found ${totalLands} lands to process`);

    // Update progress with total count
    await supabase
      .from('tile_marking_progress')
      .update({
        total_lands: totalLands,
        current_step: totalLands > 0 ? 'Processing land boundaries...' : 'No lands found'
      })
      .eq('execution_id', executionId);

    if (!lands || lands.length === 0) {
      await supabase
        .from('tile_marking_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('execution_id', executionId);
        
      return new Response(
        JSON.stringify({
          success: true,
          execution_id: executionId,
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
        
        // Update progress for current land
        await supabase
          .from('tile_marking_progress')
          .update({
            current_land_id: land.id,
            processed_lands: processedLands,
            current_step: `Processing land ${processedLands + 1}/${totalLands}: Checking intersections...`
          })
          .eq('execution_id', executionId);
        
        // Calculate land area in km² from geometry
        const { data: areaData, error: areaError } = await supabase
          .rpc('calculate_area_km2', { geom: land.boundary });
        
        if (areaError) {
          console.error(`[mark-agricultural-tiles] Error calculating area for land ${land.id}:`, areaError);
          errors.push({ land_id: land.id, error: areaError.message });
          continue;
        }

        const landAreaKm2 = areaData || 0;
        
        // Update step: Finding intersecting tiles
        await supabase
          .from('tile_marking_progress')
          .update({
            current_step: `Processing land ${processedLands + 1}/${totalLands}: Finding MGRS tiles...`
          })
          .eq('execution_id', executionId);
        
        // Find MGRS tile containing this land using spatial intersection
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

          // Update step: Marking tile
          await supabase
            .from('tile_marking_progress')
            .update({
              current_step: `Processing land ${processedLands + 1}/${totalLands}: Marking tile ${mgrsTile.tile_id}...`
            })
            .eq('execution_id', executionId);

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
            
            // Update progress with marked tiles count
            await supabase
              .from('tile_marking_progress')
              .update({
                marked_tiles_count: markedTiles.size
              })
              .eq('execution_id', executionId);
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

    // Mark as completed
    await supabase
      .from('tile_marking_progress')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_lands: processedLands,
        marked_tiles_count: markedTiles.size,
        errors: JSON.stringify(errors),
        current_step: 'Completed successfully'
      })
      .eq('execution_id', executionId);

    const result = {
      success: true,
      execution_id: executionId,
      data: {
        total_lands: totalLands,
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
    
    // Try to mark as failed in progress table
    try {
      const executionId = crypto.randomUUID();
      await supabase
        .from('tile_marking_progress')
        .insert({
          execution_id: executionId,
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: JSON.stringify([{ error: error.message }]),
          current_step: 'Failed with error'
        });
    } catch (progError) {
      console.error('[mark-agricultural-tiles] Failed to log error:', progError);
    }
    
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
