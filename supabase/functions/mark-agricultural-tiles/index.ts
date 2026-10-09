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

    // Check total lands in database
    const { count: totalLandsCount } = await supabase
      .from('lands')
      .select('*', { count: 'exact', head: true });
    
    console.log(`[mark-agricultural-tiles] Total lands in database: ${totalLandsCount}`);

    // Check lands with boundaries (using boundary_geom which is the actual column with data)
    const { count: landsWithBoundaries } = await supabase
      .from('lands')
      .select('*', { count: 'exact', head: true })
      .not('boundary_geom', 'is', null);
    
    console.log(`[mark-agricultural-tiles] Lands with boundaries: ${landsWithBoundaries}`);

    // Get all lands with boundaries (boundary_geom is the actual geometry column with data)
    // Join with farmers to ensure we're only processing active lands
    const { data: lands, error: landsError } = await supabase
      .from('lands')
      .select(`
        id, 
        boundary_geom,
        farmer_id,
        farmers!inner(id, tenant_id)
      `)
      .not('boundary_geom', 'is', null);

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
    console.log(`[mark-agricultural-tiles] Found ${totalLands} lands to process (with valid boundaries and farmer associations)`);
    console.log(`[mark-agricultural-tiles] Database stats: ${totalLandsCount} total lands, ${landsWithBoundaries} with boundaries, ${totalLands} processable`);

    // Update progress with total count and statistics
    await supabase
      .from('tile_marking_progress')
      .update({
        total_lands: totalLands,
        current_step: totalLands > 0 
          ? `Processing ${totalLands} lands with boundaries (${totalLandsCount} total in DB)...` 
          : `No processable lands found (${totalLandsCount} total, ${landsWithBoundaries} with boundaries)`
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
            total_lands_in_db: totalLandsCount,
            lands_with_boundaries: landsWithBoundaries,
            processed_lands: 0,
            marked_tiles: [],
            marked_tiles_count: 0,
            created_satellite_tiles: [],
            errors: []
          },
          message: `No processable lands found. Database has ${totalLandsCount} total lands, ${landsWithBoundaries} have boundaries, but none have valid farmer associations.`
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
          .rpc('calculate_area_km2', { geom: land.boundary_geom });
        
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
          .rpc('find_mgrs_tile_for_land', { land_geom: land.boundary_geom });

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

          // Trigger tile fetch via NDVI data process API
          console.log(`[mark-agricultural-tiles] Triggering tile fetch for ${mgrsTile.tile_id}`);
          
          try {
            const { data: ndviResult, error: ndviError } = await supabase.functions.invoke('ndvi-data-process', {
              body: {
                tile_id: mgrsTile.tile_id,
                cloud_cover: 20,
                lookback_days: 30
              }
            });

            if (!ndviError && ndviResult) {
              console.log(`[mark-agricultural-tiles] Tile fetch triggered for ${mgrsTile.tile_id}:`, ndviResult.status || 'success');
              createdSatTiles.push(mgrsTile.tile_id);
            } else {
              console.error(`[mark-agricultural-tiles] Failed to trigger tile fetch for ${mgrsTile.tile_id}:`, ndviError?.message || 'Unknown error');
            }
          } catch (fetchError: any) {
            console.error(`[mark-agricultural-tiles] Error calling ndvi-data-process:`, fetchError.message);
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
        total_lands_in_db: totalLandsCount,
        lands_with_boundaries: landsWithBoundaries,
        total_lands: totalLands,
        processed_lands: processedLands,
        marked_tiles: Array.from(markedTiles),
        marked_tiles_count: markedTiles.size,
        created_satellite_tiles: createdSatTiles,
        errors
      },
      message: `Successfully marked ${markedTiles.size} MGRS tiles as agricultural from ${processedLands}/${totalLands} lands (${totalLandsCount} total in DB, ${landsWithBoundaries} with boundaries)`
    };

    console.log('[mark-agricultural-tiles] Complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[mark-agricultural-tiles] Fatal error:', error);
    
    // Try to mark as failed in progress table
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const executionId = crypto.randomUUID();
      await supabase
        .from('tile_marking_progress')
        .insert({
          execution_id: executionId,
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: JSON.stringify([{ error: errorMessage }]),
          current_step: 'Failed with error'
        });
    } catch (progError) {
      console.error('[mark-agricultural-tiles] Failed to log error:', progError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
