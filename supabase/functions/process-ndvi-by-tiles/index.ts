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
      tileIds = [],
      forceUpdate = false,
    } = await req.json();

    console.log(`[process-ndvi-by-tiles] Starting with params:`, {
      startDate,
      endDate,
      cloudCoverage,
      tileIds,
      forceUpdate,
    });

    const accessToken = await getOAuthToken();
    if (!accessToken) throw new Error('Failed to obtain OAuth token');

    const tilesToProcess = await getTilesToProcess(supabase, tileIds);
    console.log(`[process-ndvi-by-tiles] Found ${tilesToProcess.length} tiles to process`);

    const processedTiles: ProcessedTile[] = [];
    const errors: any[] = [];

    for (const tile of tilesToProcess) {
      console.log(`\n[process-ndvi-by-tiles] Processing tile: ${tile.tile_id}`);

      // ✅ Safe bbox extraction
      const bbox = extractBboxFromGeometry(tile.geometry);
      if (!bbox) {
        console.warn(`[process-ndvi-by-tiles] Skipping tile ${tile.tile_id}: invalid geometry`);

        await supabase.from('satellite_tiles').upsert({
          tile_id: tile.tile_id,
          acquisition_date: new Date().toISOString().split('T')[0],
          status: 'skipped',
          error_message: 'Invalid geometry',
          last_checked: new Date().toISOString(),
        }, { onConflict: 'tile_id,acquisition_date' });

        processedTiles.push({
          tile_id: tile.tile_id,
          acquisition_date: '',
          cloud_cover: 0,
          ndvi_mean: 0,
          affected_lands: 0,
          status: 'skipped',
          error: 'Invalid geometry',
        });
        continue;
      }

      try {
        const result = await processTileNdvi(tile.tile_id, bbox, startDate, endDate, cloudCoverage, accessToken);
        if (!result) {
          errors.push({ tile_id: tile.tile_id, error: 'No satellite data available' });
          continue;
        }

        const storageUrl = await storeTileNdvi(tile.tile_id, result, supabase);
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

        console.log(`[process-ndvi-by-tiles] ✓ Processed ${tile.tile_id}, affected ${affectedLands} lands`);
      } catch (err) {
        console.error(`[process-ndvi-by-tiles] Error:`, err);
        errors.push({ tile_id: tile.tile_id, error: err.message });

        processedTiles.push({
          tile_id: tile.tile_id,
          acquisition_date: '',
          cloud_cover: 0,
          ndvi_mean: 0,
          affected_lands: 0,
          status: 'failed',
          error: err.message,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        total_tiles: tilesToProcess.length,
        processed_tiles: processedTiles.filter(t => t.status === 'success').length,
        skipped_tiles: processedTiles.filter(t => t.status === 'skipped').length,
        tiles: processedTiles,
        errors,
      },
      message: `Processed ${processedTiles.filter(t => t.status === 'success').length} of ${tilesToProcess.length} tiles`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[process-ndvi-by-tiles] Fatal error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getOAuthToken(): Promise<string | null> {
  const clientId = Deno.env.get('COPERNICUS_CLIENT_ID');
  const clientSecret = Deno.env.get('COPERNICUS_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

async function getTilesToProcess(supabase: any, tileIds: string[]): Promise<TileToProcess[]> {
  const { data, error } = await supabase.from('mgrs_tiles').select('tile_id, id, geometry');
  if (error) throw error;
  return (data || []).map((tile: any) => ({
    tile_id: tile.tile_id,
    mgrs_id: tile.id,
    geometry: tile.geometry,
    bbox: null, // extracted later safely
  }));
}

// ✅ Safe bbox extractor
function extractBboxFromGeometry(geometry: any): number[] | null {
  try {
    if (!geometry || !geometry.type || !geometry.coordinates) return null;
    let coords: number[][] = [];
    if (geometry.type === 'Polygon') coords = geometry.coordinates?.[0] || [];
    if (geometry.type === 'MultiPolygon') coords = geometry.coordinates?.[0]?.[0] || [];
    if (!coords.length) return null;

    const lons = coords.map(c => c[0]).filter(n => !isNaN(n));
    const lats = coords.map(c => c[1]).filter(n => !isNaN(n));
    if (!lons.length || !lats.length) return null;

    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
  } catch {
    return null;
  }
}

// ✅ Process NDVI with consistent collection name
async function processTileNdvi(tileId: string, bbox: number[], startDate: string, endDate: string, cloudCoverage: number, token: string): Promise<TileProcessingResult | null> {
  // 1. Catalog API
  const catalogPayload = {
    collections: ['sentinel-2-l2a'],  // ✅ fixed
    bbox,
    datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
    limit: 10,
  };

  const catalogRes = await fetch('https://catalogue.dataspace.copernicus.eu/stac/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(catalogPayload),
  });

  if (!catalogRes.ok) return null;
  const catalogData = await catalogRes.json();
  if (!catalogData.features?.length) return null;

  const scene = catalogData.features.find((f: any) => f.id.includes('MSIL2A'));
  if (!scene) return null;

  const acquisitionDate = scene.properties.datetime.split('T')[0];
  const cloudCover = scene.properties['eo:cloud_cover'] || 0;

  // 2. Statistical API
  const statsPayload = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{ type: 'sentinel-2-l2a', dataFilter: { timeRange: { from: `${acquisitionDate}T00:00:00Z`, to: `${acquisitionDate}T23:59:59Z` }, maxCloudCoverage: cloudCoverage } }]
    },
    aggregation: {
      timeRange: { from: `${acquisitionDate}T00:00:00Z`, to: `${acquisitionDate}T23:59:59Z` },
      aggregationInterval: { of: 'P1D' },
      width: 512,
      height: 512,
      evalscript: `
        //VERSION=3
        function setup() {
          return { input: [{ bands: ["B04","B08"], units: "REFLECTANCE" }], output: [{ id:"ndvi", bands:1, sampleType:"FLOAT32" }] };
        }
        function evaluatePixel(s) {
          let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
          return { ndvi: [ndvi] };
        }`
    },
    calculations: { default: { statistics: { default: { percentiles: { k: [10,25,50,75,90] } } } } }
  };

  const statsRes = await fetch('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(statsPayload),
  });

  if (!statsRes.ok) return null;
  const statsData = await statsRes.json();
  const ndviStats = statsData.data?.[0]?.outputs?.default?.bands?.ndvi?.stats || {};  // ✅ fixed path

  const stats: NdviStats = {
    mean: ndviStats.mean || 0,
    min: ndviStats.min || 0,
    max: ndviStats.max || 0,
    std: ndviStats.stDev || 0,
    percentiles: ndviStats.percentiles || {},
  };

  // 3. Process API → NDVI PNG
  const processPayload = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{ type: 'sentinel-2-l2a', dataFilter: { timeRange: { from: `${acquisitionDate}T00:00:00Z`, to: `${acquisitionDate}T23:59:59Z` }, maxCloudCoverage: cloudCoverage } }]
    },
    output: { width: 512, height: 512, responses: [{ identifier: 'default', format: { type: 'image/png' } }] },
    evalscript: `//VERSION=3
      function setup(){return {input:[{bands:["B04","B08"],units:"REFLECTANCE"}],output:{bands:3}};}
      function evaluatePixel(s){let ndvi=(s.B08-s.B04)/(s.B08+s.B04);return [ndvi,ndvi,ndvi];}`
  };

  const processRes = await fetch('https://sh.dataspace.copernicus.eu/api/v1/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Accept': 'image/png' },
    body: JSON.stringify(processPayload),
  });

  if (!processRes.ok) return null;
  const imageBlob = await processRes.blob();

  return { scene, stats, imageBlob, bbox, acquisition_date: acquisitionDate, cloud_cover: cloudCover };
}

// TODO: keep your existing storeTileNdvi() + mapLandsToTile() implementations
