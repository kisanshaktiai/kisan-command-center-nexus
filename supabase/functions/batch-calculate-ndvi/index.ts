import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * BATCH NDVI CALCULATION
 * 
 * Processes multiple tiles in parallel for efficient NDVI calculation
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      status = 'metadata_only',
      limit = 10,
      forceRecalculate = false 
    } = await req.json();

    console.log(`[batch-calculate-ndvi] Processing tiles with status: ${status}, limit: ${limit}`);

    // Get tiles that need processing
    let query = supabase
      .from('satellite_tiles')
      .select('id, tile_id, acquisition_date, status, ndvi_mean')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!forceRecalculate) {
      query = query.is('ndvi_mean', null);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: tiles, error: tilesError } = await query;

    if (tilesError) {
      throw tilesError;
    }

    if (!tiles || tiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No tiles found for processing",
          processed: 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[batch-calculate-ndvi] Found ${tiles.length} tiles to process`);

    const results = {
      total: tiles.length,
      succeeded: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process tiles in batches of 3 to avoid overwhelming the system
    const batchSize = 3;
    for (let i = 0; i < tiles.length; i += batchSize) {
      const batch = tiles.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(tile => 
          fetch(`${supabaseUrl}/functions/v1/calculate-ndvi`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              tileId: tile.id,
              forceRecalculate
            })
          }).then(res => res.json())
        )
      );

      for (const [index, result] of batchResults.entries()) {
        if (result.status === 'fulfilled' && result.value.success) {
          results.succeeded++;
          console.log(`[batch-calculate-ndvi] Successfully processed tile: ${batch[index].tile_id}`);
        } else {
          results.failed++;
          const error = result.status === 'rejected' 
            ? result.reason 
            : result.value.error;
          results.errors.push({
            tile_id: batch[index].tile_id,
            error: error
          });
          console.error(`[batch-calculate-ndvi] Failed to process tile ${batch[index].tile_id}:`, error);
        }
      }

      // Small delay between batches
      if (i + batchSize < tiles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[batch-calculate-ndvi] Batch processing complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.total} tiles: ${results.succeeded} succeeded, ${results.failed} failed`,
        results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[batch-calculate-ndvi] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Batch NDVI calculation failed",
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
