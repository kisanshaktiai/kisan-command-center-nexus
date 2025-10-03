import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TileToProcess {
  tile_id: string;
  mgrs_id: string;
  geometry: any;
  bbox: number[] | null;
}

interface ProcessedTile {
  tile_id: string;
  acquisition_date: string;
  cloud_cover: number;
  ndvi_mean: number;
  affected_lands: number;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

interface NdviStats {
  mean: number;
  min: number;
  max: number;
  std: number;
  percentiles?: Record<string, number>;
}

interface TileProcessingResult {
  scene: any;
  stats: NdviStats;
  imageBlob: Blob;
  bbox: number[];
  acquisition_date: string;
  cloud_cover: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      startDate,
      endDate,
      cloudCoverage = 20,
      regions = [],
      tileIds = [],
      forceUpdate = false,
    } = await req.json();

    console.log(`[process-ndvi-by-tiles] Starting with params:`, {
      startDate,
      endDate,
      cloudCoverage,
      regions,
      tileIds,
      forceUpdate,
    });

    // OAuth token
    const accessToken = await getOAuthToken();
    if (!accessToken) throw new Error('Failed to obtain OAuth token');
    console.log('[process-ndvi-by-tiles] ✓ OAuth token obtained');

    // Get tiles
    const tilesToProcess = await getTilesToProcess(supabase, tileIds, forceUpdate);
    console.log(`[process-ndvi-by-tiles] Found ${tilesToProcess.length} tiles to process`);

    const processedTiles: ProcessedTile[] = [];
    const errors: any[] = [];
    let skippedCount = 0;

    for (const tile of tilesToProcess) {
      try {
        console.log(`\n[process-ndvi-by-tiles] Processing tile: ${tile.tile_id}`);

        // Validate bbox
        const bbox = extractBboxFromGeometry(tile.geometry);
        if (!bbox) {
          skippedCount++;
          processedTiles.push({
            tile_id: tile.tile_id,
            acquisition_date: '',
            cloud_cover: 0,
            ndvi_mean: 0,
            affected_lands: 0,
            status: 'skipped',
            error: 'Invalid geometry',
          });

          await supabase.from('satellite_tiles').upsert({
            tile_id: tile.tile_id,
            acquisition_date: new Date().toISOString().split('T')[0],
            status: 'skipped',
            error_message: 'Invalid geometry',
            last_checked: new Date().toISOString(),
          }, { onConflict: 'tile_id,acquisition_date' });

          console.warn(`[process-ndvi-by-tiles] Skipped tile ${tile.tile_id}: invalid geometry`);
          continue;
        }

        // Skip fresh
        if (!forceUpdate && await isTileFresh(supabase, tile.tile_id)) {
          console.log(`[process-ndvi-by-tiles] Skipping fresh tile: ${tile.tile_id}`);
          skippedCount++;
          continue;
        }

        // Process NDVI
        const result = await processTileNdvi(tile, startDate, endDate, cloudCoverage, accessToken, bbox);
        if (!result) {
          console.log(`[process-ndvi-by-tiles] No data for tile: ${tile.tile_id}`);
          errors.push({ tile_id: tile.tile_id, error: 'No satellite data available' });
          continue;
        }

        const storageUrl = await storeTileNdvi(tile, result, supabase);

        const affectedLands = await mapLandsToTile(
          tile.tile_id,
          result.acquisition_date,
          result.stats,
          storageUrl,
          result.cloud_cover,
          result.bbox,
          supabase
        );

        processedTiles.push({
          tile_id: tile.tile_id,
          acquisition_date: result.acquisition_date,
          cloud_cover: result.cloud_cover,
          ndvi_mean: result.stats.mean,
          affected_lands: affectedLands,
          status: 'success',
        });

        console.log(`[process-ndvi-by-tiles] ✓ Done ${tile.tile_id}, lands: ${affectedLands}`);
      } catch (error) {
        console.error(`[process-ndvi-by-tiles] Error in ${tile.tile_id}:`, error);
        errors.push({ tile_id: tile.tile_id, error: error.message });
        processedTiles.push({
          tile_id: tile.tile_id,
          acquisition_date: '',
          cloud_cover: 0,
          ndvi_mean: 0,
          affected_lands: 0,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const response = {
      success: true,
      data: {
        total_tiles: tilesToProcess.length,
        processed_tiles: processedTiles.filter(t => t.status === 'success').length,
        skipped_tiles: skippedCount,
        tiles: processedTiles,
        errors,
      },
      message: `Processed ${processedTiles.filter(t => t.status === 'success').length} of ${tilesToProcess.length} tiles`,
    };

    console.log('[process-ndvi-by-tiles] Complete:', response);
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[process-ndvi-by-tiles] Fatal:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ===== HELPERS =====

async function getOAuthToken(): Promise<string | null> {
  const clientId = Deno.env.get('COPERNICUS_CLIENT_ID');
  const clientSecret = Deno.env.get('COPERNICUS_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  const response = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token;
}

async function getTilesToProcess(supabase: any, tileIds: string[], forceUpdate: boolean): Promise<TileToProcess[]> {
  const { data: tilesWithLands, error: landsError } = await supabase.rpc('get_tiles_with_lands');
  if (landsError) throw new Error(`Failed to fetch tiles with lands: ${landsError.message}`);

  const tilesWithLandIds = (tilesWithLands || []).map((t: any) => t.tile_id);
  if (tilesWithLandIds.length === 0) return [];

  let query = supabase.from('mgrs_tiles')
    .select('tile_id, id, geometry')
    .eq('is_agri', true)
    .in('tile_id', tilesWithLandIds);

  if (tileIds.length > 0) query = query.in('tile_id', tileIds);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch tiles: ${error.message}`);

  return (data || []).map((tile: any) => ({
    tile_id: tile.tile_id,
    mgrs_id: tile.id,
    geometry: tile.geometry,
    bbox: extractBboxFromGeometry(tile.geometry),
  }));
}

async function isTileFresh(supabase: any, tileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('satellite_tiles')
    .select('last_checked')
    .eq('tile_id', tileId)
    .eq('status', 'ready')
    .gte('last_checked', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle();

  return !!data && !error;
}

function extractBboxFromGeometry(geometry: any): number[] | null {
  try {
    if (!geometry || !geometry.type || !geometry.coordinates) return null;
    let coords: number[][] = [];
    if (geometry.type === 'Polygon') coords = geometry.coordinates?.[0] || [];
    else if (geometry.type === 'MultiPolygon') coords = geometry.coordinates?.[0]?.[0] || [];
    else return null;

    if (!coords.length) return null;
    const lons = coords.map(c => c[0]).filter(n => !isNaN(n));
    const lats = coords.map(c => c[1]).filter(n => !isNaN(n));
    if (!lons.length || !lats.length) return null;
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
  } catch (err) {
    console.error('[extractBbox] ❌ Error:', err.message);
    return null;
  }
}
