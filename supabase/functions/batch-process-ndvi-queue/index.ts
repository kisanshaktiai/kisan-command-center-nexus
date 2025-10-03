import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to calculate union bbox from multiple bboxes
function calculateUnionBbox(bboxes: number[][]): number[] {
  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;
  
  bboxes.forEach(bbox => {
    minLng = Math.min(minLng, bbox[0]);
    minLat = Math.min(minLat, bbox[1]);
    maxLng = Math.max(maxLng, bbox[2]);
    maxLat = Math.max(maxLat, bbox[3]);
  });
  
  return [minLng, minLat, maxLng, maxLat];
}

// Helper to extract bbox from land boundary
function extractBboxFromBoundary(boundary: any): number[] {
  try {
    if (boundary.type === 'Polygon') {
      const coordinates = boundary.coordinates[0];
      let minLng = Infinity, minLat = Infinity;
      let maxLng = -Infinity, maxLat = -Infinity;
      
      coordinates.forEach(([lng, lat]: [number, number]) => {
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      });
      
      return [minLng, minLat, maxLng, maxLat];
    }
  } catch (error) {
    console.error('[extractBboxFromBoundary] Error:', error);
  }
  return [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[batch-process-ndvi-queue] Starting batch processing');

    // 1. Get pending requests
    const { data: queuedRequests, error: queueError } = await supabase
      .from('ndvi_request_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .limit(100);

    if (queueError || !queuedRequests || queuedRequests.length === 0) {
      console.log('[batch-process-ndvi-queue] No queued requests');
      return new Response(
        JSON.stringify({ success: true, message: 'No requests to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[batch-process-ndvi-queue] Processing ${queuedRequests.length} queued requests`);

    // 2. Group requests by tile_id (for spatial batching)
    const batchesByTile = new Map<string, any[]>();
    
    for (const request of queuedRequests) {
      // Fetch lands to determine tile grouping
      const { data: lands } = await supabase
        .from('lands')
        .select('id, boundary, area, farmer:farmers(id, tenant_id)')
        .in('id', request.land_ids);

      if (!lands || lands.length === 0) continue;

      // For simplicity, group all lands in same request together
      const key = `${request.tenant_id}_${request.date_from}_${request.date_to}`;
      
      if (!batchesByTile.has(key)) {
        batchesByTile.set(key, []);
      }
      
      batchesByTile.get(key)!.push({
        request,
        lands
      });
    }

    let totalProcessed = 0;
    let totalErrors = 0;

    // 3. Process each batch
    for (const [key, batchData] of batchesByTile) {
      console.log(`[batch-process-ndvi-queue] Processing batch: ${key}`);

      try {
        // Collect all land bboxes
        const landBboxes: number[][] = [];
        const allLands: any[] = [];
        
        batchData.forEach(item => {
          item.lands.forEach((land: any) => {
            const bbox = extractBboxFromBoundary(land.boundary);
            if (bbox.length > 0) {
              landBboxes.push(bbox);
              allLands.push(land);
            }
          });
        });

        if (landBboxes.length === 0) {
          console.warn('[batch-process-ndvi-queue] No valid bboxes in batch');
          continue;
        }

        // Calculate combined bbox
        const combinedBbox = calculateUnionBbox(landBboxes);
        console.log('[batch-process-ndvi-queue] Combined bbox:', combinedBbox);

        // 4. Cache NDVI data for each land (using mock data for now)
        for (const land of allLands) {
          const landBbox = extractBboxFromBoundary(land.boundary);
          
          const { error: cacheError } = await supabase
            .from('ndvi_micro_tiles')
            .insert({
              land_id: land.id,
              farmer_id: land.farmer.id,
              tenant_id: land.farmer.tenant_id,
              bbox: landBbox,
              acquisition_date: new Date().toISOString().split('T')[0],
              cloud_cover: 15,
              ndvi_mean: 0.65 + Math.random() * 0.2,
              ndvi_min: 0.3 + Math.random() * 0.1,
              ndvi_max: 0.8 + Math.random() * 0.15,
              ndvi_std_dev: 0.1 + Math.random() * 0.05,
              statistics_only: true,
              processing_units_used: 0.1,
              resolution_meters: 60,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });

          if (!cacheError) {
            totalProcessed++;
          } else {
            console.error('[batch-process-ndvi-queue] Cache error:', cacheError);
            totalErrors++;
          }
        }

        // 5. Update request status
        for (const item of batchData) {
          await supabase
            .from('ndvi_request_queue')
            .update({
              status: 'completed',
              processed_count: item.lands.length,
              completed_at: new Date().toISOString(),
              processing_units_consumed: 0.1 * item.lands.length
            })
            .eq('id', item.request.id);
        }

      } catch (batchError) {
        console.error('[batch-process-ndvi-queue] Batch error:', batchError);
        totalErrors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch processing completed`,
        stats: {
          totalProcessed,
          totalErrors,
          batchesProcessed: batchesByTile.size
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[batch-process-ndvi-queue] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
