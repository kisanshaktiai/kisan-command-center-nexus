import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to calculate optimal resolution based on land area
function calculateOptimalResolution(areaHectares: number): number {
  if (areaHectares < 1) return 10;  // High detail for small farms
  if (areaHectares < 10) return 20; // Medium detail
  return 60; // Coarse for large areas
}

// Helper to extract bbox from land boundary geometry
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

    const { landId, urgent = false, statisticsOnly = true } = await req.json();

    console.log('[fetch-land-ndvi] Request:', { landId, urgent, statisticsOnly });

    if (!landId) {
      return new Response(
        JSON.stringify({ success: false, error: 'landId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check cache first
    const { data: cachedData, error: cacheError } = await supabase
      .from('ndvi_micro_tiles')
      .select('*')
      .eq('land_id', landId)
      .gte('expires_at', new Date().toISOString())
      .order('acquisition_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedData && !cacheError) {
      console.log('[fetch-land-ndvi] Returning cached data');
      
      // Update access tracking
      await supabase
        .from('ndvi_micro_tiles')
        .update({
          access_count: (cachedData.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', cachedData.id);

      return new Response(
        JSON.stringify({
          success: true,
          data: cachedData,
          cached: true,
          message: 'Data served from cache'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get land information
    const { data: land, error: landError } = await supabase
      .from('lands')
      .select('*, farmer:farmers(id, tenant_id)')
      .eq('id', landId)
      .single();

    if (landError || !land) {
      return new Response(
        JSON.stringify({ success: false, error: 'Land not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Extract bbox from land boundary
    const landBbox = extractBboxFromBoundary(land.boundary);
    if (landBbox.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid land boundary' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Calculate optimal resolution
    const resolution = calculateOptimalResolution(land.area || 1);

    // 5. If not urgent, add to batch queue
    if (!urgent) {
      const { error: queueError } = await supabase
        .from('ndvi_request_queue')
        .insert({
          tenant_id: land.farmer.tenant_id,
          land_ids: [landId],
          tile_id: 'pending', // Will be determined by batch processor
          date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          date_to: new Date().toISOString().split('T')[0],
          statistics_only: statisticsOnly,
          priority: 5
        });

      if (queueError) {
        console.error('[fetch-land-ndvi] Queue error:', queueError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'queued',
          message: 'Request queued for batch processing',
          estimatedReady: '30 minutes'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. For urgent requests, return immediate response
    // (In production, this would call Copernicus API for small bbox)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Urgent processing initiated',
        data: {
          land_id: landId,
          bbox: landBbox,
          resolution,
          status: 'processing'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-land-ndvi] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
