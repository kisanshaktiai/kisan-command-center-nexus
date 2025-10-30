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

    // 2. Get land information
    const { data: land, error: landError } = await supabase
      .from('lands')
      .select(`
        *,
        farmer:farmers(id, tenant_id)
      `)
      .eq('id', landId)
      .single();

    if (landError || !land) {
      return new Response(
        JSON.stringify({ success: false, error: 'Land not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Find which MGRS tile contains this land polygon using PostGIS
    const { data: containingTiles, error: tileError } = await supabase
      .rpc('find_mgrs_tile_for_land', { land_geom: land.boundary });

    if (tileError) {
      console.error('[fetch-land-ndvi] Error finding MGRS tile:', tileError);
    }

    let mgrsTileId = null;
    let tileId = null;

    if (containingTiles && containingTiles.length > 0) {
      mgrsTileId = containingTiles[0].id;
      tileId = containingTiles[0].tile_id;
      
      console.log(`[fetch-land-ndvi] Land ${landId} falls in MGRS tile ${tileId}`);

      // Mark this MGRS tile as agricultural
      const { error: updateError } = await supabase
        .from('mgrs_tiles')
        .update({ is_agri: true })
        .eq('id', mgrsTileId);

      if (updateError) {
        console.error('[fetch-land-ndvi] Error marking tile as agricultural:', updateError);
      } else {
        console.log(`[fetch-land-ndvi] ✓ Marked MGRS tile ${tileId} as agricultural`);
      }

      // Ensure satellite_tile record exists for this MGRS tile
      const { data: existingSatTile } = await supabase
        .from('satellite_tiles')
        .select('id, status')
        .eq('tile_id', tileId)
        .eq('acquisition_date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (!existingSatTile) {
        // Create satellite tile record
        const { error: satTileError } = await supabase
          .from('satellite_tiles')
          .insert({
            tile_id: tileId,
            mgrs_tile_id: mgrsTileId,
            status: 'pending',
            data_source: 'copernicus',
            acquisition_date: new Date().toISOString().split('T')[0],
            collection: 'SENTINEL-2'
          });

        if (satTileError) {
          console.error('[fetch-land-ndvi] Error creating satellite tile:', satTileError);
        } else {
          console.log(`[fetch-land-ndvi] ✓ Created satellite_tile record for ${tileId}`);
        }
      }
    }

    // 4. Check if we have a cached tile-level NDVI
    if (tileId) {
      const { data: tileCacheData } = await supabase
        .from('satellite_tiles')
        .select('*')
        .eq('tile_id', tileId)
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

    // 5. No cache available - need to fetch from API
    console.log('[fetch-land-ndvi] No cache available, triggering tile download');

    if (!tileId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not determine MGRS tile for this land parcel' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // 6. Trigger tile update for this agricultural tile
    console.log(`[fetch-land-ndvi] Triggering NDVI download for tile ${tileId}`);
    
    // Call update-ndvi-tiles function to download NDVI for this specific tile
    const { data: updateResult, error: updateError } = await supabase.functions.invoke(
      'update-ndvi-tiles',
      {
        body: { 
          tileIds: [tileId],
          forceUpdate: true,
          cloudCoverage: 30
        }
      }
    );

    if (updateError) {
      console.error('[fetch-land-ndvi] Error triggering tile update:', updateError);
      
      // If not urgent, fall back to queueing
      if (!urgent) {
        const { error: queueError } = await supabase
          .from('ndvi_request_queue')
          .insert({
            tenant_id: land.farmer.tenant_id,
            land_ids: [landId],
            tile_id: tileId,
            date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            date_to: new Date().toISOString().split('T')[0],
            statistics_only: statisticsOnly,
            priority: urgent ? 1 : 5
          });

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

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to trigger tile update' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success with download status
    return new Response(
      JSON.stringify({
        success: true,
        message: `NDVI download triggered for tile ${tileId}`,
        data: {
          land_id: landId,
          tile_id: tileId,
          mgrs_tile_id: mgrsTileId,
          bbox: landBbox,
          resolution,
          status: 'downloading',
          updateResult
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
