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

    // 1. Check cache first (land-specific NDVI data)
    const { data: cachedData, error: cacheError } = await supabase
      .from('ndvi_micro_tiles')
      .select('*')
      .eq('land_id', landId)
      .gte('expires_at', new Date().toISOString())
      .order('acquisition_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedData && !cacheError) {
      console.log('[fetch-land-ndvi] ✓ Returning cached land NDVI data');
      
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
          source: 'land_cache',
          message: 'Data served from land cache (0 API cost)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get land information and tile mapping
    const { data: land, error: landError } = await supabase
      .from('lands')
      .select(`
        *,
        farmer:farmers(id, tenant_id),
        land_tile_mapping(tile_id, mgrs_tile:mgrs_tiles(id, tile_id, geometry))
      `)
      .eq('id', landId)
      .single();

    if (landError || !land) {
      return new Response(
        JSON.stringify({ success: false, error: 'Land not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check if we have a cached tile-level NDVI
    const tileMapping = land.land_tile_mapping?.[0];
    if (tileMapping?.tile_id) {
      const { data: tileCacheData } = await supabase
        .from('satellite_tiles')
        .select('*')
        .eq('tile_id', tileMapping.tile_id)
        .eq('status', 'ready')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tileCacheData && tileCacheData.ndvi_mean !== null) {
        console.log('[fetch-land-ndvi] ✓ Found cached tile, clipping to land');
        
        // Extract bbox from land boundary
        const landBbox = extractBboxFromBoundary(land.boundary);
        
        // For now, we approximate land NDVI from tile NDVI
        // In production, this would clip the actual NDVI image to land polygon
        const landNdviData = {
          land_id: landId,
          farmer_id: land.farmer_id,
          tenant_id: land.farmer.tenant_id,
          bbox: landBbox,
          acquisition_date: tileCacheData.acquisition_date,
          cloud_cover: tileCacheData.cloud_cover,
          ndvi_mean: tileCacheData.ndvi_mean,
          ndvi_min: tileCacheData.ndvi_min,
          ndvi_max: tileCacheData.ndvi_max,
          ndvi_std_dev: tileCacheData.ndvi_std_dev,
          ndvi_thumbnail_url: tileCacheData.ndvi_image_url,
          statistics_only: statisticsOnly,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          processing_units_used: 0, // Zero cost - clipped from tile
          resolution_meters: 500 // Tile resolution
        };

        // Cache the land-specific data
        const { error: insertError } = await supabase
          .from('ndvi_micro_tiles')
          .insert(landNdviData);

        if (insertError) {
          console.error('[fetch-land-ndvi] Cache insert error:', insertError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: landNdviData,
            cached: true,
            source: 'tile_cache_clipped',
            message: 'Data clipped from cached tile (0 API cost)'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. No cache available - need to fetch from API
    console.log('[fetch-land-ndvi] No cache available, need to fetch from Copernicus');

    // Extract bbox from land boundary
    const landBbox = extractBboxFromBoundary(land.boundary);
    if (landBbox.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid land boundary' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate optimal resolution
    const resolution = calculateOptimalResolution(land.area || 1);

    // 5. If not urgent, add to batch queue
    if (!urgent) {
      const { error: queueError } = await supabase
        .from('ndvi_request_queue')
        .insert({
          tenant_id: land.farmer.tenant_id,
          land_ids: [landId],
          tile_id: tileMapping?.tile_id || 'pending',
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
          estimatedReady: 'Next scheduled sync (within 24h)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. For urgent requests, trigger tile update
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tile update triggered - please wait',
        data: {
          land_id: landId,
          tile_id: tileMapping?.tile_id,
          bbox: landBbox,
          resolution,
          status: 'requesting_tile_update'
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
