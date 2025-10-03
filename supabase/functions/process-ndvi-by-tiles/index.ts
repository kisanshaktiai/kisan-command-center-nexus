// process-ndvi-by-tiles.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const COPERNICUS_AUTH_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const COPERNICUS_CATALOG_API =
  'https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search';
const COPERNICUS_STATISTICAL_API =
  'https://sh.dataspace.copernicus.eu/api/v1/statistics';
const COPERNICUS_PROCESS_API =
  'https://sh.dataspace.copernicus.eu/api/v1/process';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * OAuth token from Copernicus
 */
async function getOAuthToken(): Promise<string> {
  const clientId = Deno.env.get('COPERNICUS_CLIENT_ID');
  const clientSecret = Deno.env.get('COPERNICUS_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Missing Copernicus credentials');
  }

  const response = await fetch(COPERNICUS_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`[OAuth] Failed: ${await response.text()}`);
  }
  const data = await response.json();
  return data.access_token;
}

/**
 * Extract bbox from Polygon / MultiPolygon
 */
function extractBbox(geometry: any): number[] {
  if (!geometry || !geometry.coordinates) throw new Error('Invalid geometry');
  let coords: number[][];
  if (geometry.type === 'Polygon') coords = geometry.coordinates[0];
  else if (geometry.type === 'MultiPolygon') coords = geometry.coordinates[0][0];
  else throw new Error(`Unsupported geometry type: ${geometry.type}`);

  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

/**
 * Expand too-small bboxes
 */
function normalizeBbox(bbox: number[], minSizeKm = 1): number[] {
  const [west, south, east, north] = bbox;
  const widthKm = (east - west) * 111.32;
  const heightKm = (north - south) * 110.57;

  if (widthKm >= minSizeKm && heightKm >= minSizeKm) return bbox;

  const midX = (west + east) / 2;
  const midY = (south + north) / 2;
  const halfDeg = (minSizeKm / 111.32) / 2;
  return [midX - halfDeg, midY - halfDeg, midX + halfDeg, midY + halfDeg];
}

/**
 * Split too-large bbox (e.g. full 100x100km tiles) into manageable sub-bboxes
 */
function splitBbox(bbox: number[], maxSizeKm = 50): number[][] {
  const [west, south, east, north] = bbox;
  const widthKm = (east - west) * 111.32;
  const heightKm = (north - south) * 110.57;

  if (widthKm <= maxSizeKm && heightKm <= maxSizeKm) return [bbox];

  const lonStep = (maxSizeKm / 111.32);
  const latStep = (maxSizeKm / 110.57);

  const bboxes: number[][] = [];
  for (let x = west; x < east; x += lonStep) {
    for (let y = south; y < north; y += latStep) {
      bboxes.push([
        x,
        y,
        Math.min(x + lonStep, east),
        Math.min(y + latStep, north),
      ]);
    }
  }
  return bboxes;
}

/**
 * Search scenes from Catalog API
 */
async function searchCatalog(
  token: string,
  bbox: number[],
  startDate: string,
  endDate: string,
  cloudCoverage: number
) {
  const payload = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
    limit: 5,
    filter: `eo:cloud_cover < ${cloudCoverage}`,
    'filter-lang': 'cql2-text',
  };

  const res = await fetch(COPERNICUS_CATALOG_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`[Catalog] ${await res.text()}`);
  const data = await res.json();
  return data.features || [];
}

/**
 * Get NDVI stats
 */
async function getNdviStats(
  token: string,
  bbox: number[],
  date: string,
  cloudCoverage: number
) {
  const evalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{ bands: ["B04","B08"], units: "REFLECTANCE" }],
        output: [{ id: "ndvi", bands: 1, sampleType: "FLOAT32" }]
      };
    }
    function evaluatePixel(s) {
      return [(s.B08 - s.B04) / (s.B08 + s.B04)];
    }
  `;

  const payload = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: { timeRange: { from: `${date}T00:00:00Z`, to: `${date}T23:59:59Z` }, maxCloudCoverage: cloudCoverage }
      }]
    },
    aggregation: {
      timeRange: { from: `${date}T00:00:00Z`, to: `${date}T23:59:59Z` },
      aggregationInterval: { of: 'P1D' },
      width: 256,
      height: 256,
      evalscript
    },
    calculations: {
      ndvi: {
        statistics: { default: { percentiles: { k: [10,25,50,75,90] } } }
      }
    }
  };

  const res = await fetch(COPERNICUS_STATISTICAL_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`[Stats] ${await res.text()}`);
  const data = await res.json();
  const stats = data.data?.[0]?.outputs?.ndvi?.bands?.B0?.stats;
  if (!stats) throw new Error('[Stats] No NDVI stats found');
  return stats;
}

/**
 * Generate NDVI PNG
 */
async function generateNdviImage(token: string, bbox: number[], date: string, cloudCoverage: number): Promise<Blob> {
  const evalscript = `
    //VERSION=3
    function setup() {
      return { input: [{bands:["B04","B08"]}], output: { bands: 3 } };
    }
    function evaluatePixel(s) {
      let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
      if (ndvi < 0.2) return [0.8,0.7,0.6];
      if (ndvi < 0.5) return [0.5,1,0.5];
      return [0,0.5,0];
    }
  `;

  const payload = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{ type: 'sentinel-2-l2a', dataFilter: { timeRange: { from: `${date}T00:00:00Z`, to: `${date}T23:59:59Z` }, maxCloudCoverage: cloudCoverage } }]
    },
    output: { width: 512, height: 512, responses: [{ identifier: 'default', format: { type: 'image/png' } }] },
    evalscript
  };

  const res = await fetch(COPERNICUS_PROCESS_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`[Process] ${await res.text()}`);
  return await res.blob();
}

/**
 * MAIN HANDLER
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { startDate, endDate, cloudCoverage = 20, tileIds = [] } = await req.json();
    const token = await getOAuthToken();

    // Fetch tiles with lands (via RPC)
    const { data: tiles, error } = await supabase.rpc('get_tiles_with_lands');
    if (error) throw new Error(error.message);

    const results = [];
    for (const t of tiles) {
      if (tileIds.length > 0 && !tileIds.includes(t.tile_id)) continue;
      const bbox = normalizeBbox(extractBbox(t.geometry));
      for (const subBbox of splitBbox(bbox)) {
        const scenes = await searchCatalog(token, subBbox, startDate, endDate, cloudCoverage);
        if (!scenes.length) continue;

        const scene = scenes[0];
        const acquisitionDate = scene.properties.datetime.split('T')[0];
        const stats = await getNdviStats(token, subBbox, acquisitionDate, cloudCoverage);
        const imgBlob = await generateNdviImage(token, subBbox, acquisitionDate, cloudCoverage);

        const fileName = `${t.tile_id}_${acquisitionDate}.png`;
        await supabase.storage.from('satellite-tiles').upload(fileName, await imgBlob.arrayBuffer(), { contentType: 'image/png', upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('satellite-tiles').getPublicUrl(fileName);

        await supabase.from('satellite_tiles').upsert({
          tile_id: t.tile_id,
          acquisition_date: acquisitionDate,
          cloud_cover: scene.properties['eo:cloud_cover'] ?? 0,
          ndvi_mean: stats.mean ?? null,
          ndvi_min: stats.min ?? null,
          ndvi_max: stats.max ?? null,
          ndvi_std_dev: stats.stDev ?? null,
          ndvi_path: publicUrl,
          status: 'ready',
          collection: 'sentinel-2-l2a',
          last_checked: new Date().toISOString(),
        }, { onConflict: 'tile_id, acquisition_date' });

        results.push({ tile: t.tile_id, date: acquisitionDate, mean: stats.mean, url: publicUrl });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[process-ndvi-by-tiles] Fatal:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
