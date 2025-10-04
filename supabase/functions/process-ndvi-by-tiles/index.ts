// functions/process-ndvi-by-tiles/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// Copernicus Data Space Ecosystem API endpoints
const COPERNICUS_CATALOG_API = 'https://catalogue.dataspace.copernicus.eu/stac/search';
const COPERNICUS_PROCESS_API = 'https://sh.dataspace.copernicus.eu/api/v1/process';
const COPERNICUS_STATISTICAL_API = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';
const COPERNICUS_AUTH_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TileToProcess {
  tile_id: string;
  mgrs_id: string;
  geometry: any;
  bbox: number[];
}

interface ProcessedTile {
  tile_id: string;
  acquisition_date: string;
  cloud_cover: number;
  ndvi_mean: number;
  affected_lands: number;
  status: 'success' | 'failed';
  error?: string;
}

interface NdviStats {
  mean: number;
  min: number;
  max: number;
  std: number;
}

interface NdviProcessResult {
  imageBuffer: Uint8Array | null;
  stats: NdviStats | null;
  acquisitionDate: string;
  cloudCover: number;
}

// ==================== HELPER FUNCTIONS (defined first for hoisting) ====================

/**
 * Get OAuth2 access token from Copernicus
 */
async function getCopernicusToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(COPERNICUS_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Extract bounding box from PostGIS geometry
 */
function extractBboxFromGeometry(geometry: any): number[] | null {
  try {
    if (!geometry || !geometry.coordinates) {
      console.error('[extractBboxFromGeometry] Geometry is null or missing coordinates');
      return null;
    }

    let coords: number[][];
    
    // Handle both MultiPolygon and Polygon geometry types
    if (geometry.type === 'MultiPolygon') {
      coords = geometry.coordinates[0][0];
    } else if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0];
    } else {
      console.error('[extractBboxFromGeometry] Unsupported geometry type:', geometry.type);
      return null;
    }

    if (!coords || coords.length === 0) {
      console.error('[extractBboxFromGeometry] Coordinates array is empty');
      return null;
    }

    const lons = coords.map((c: number[]) => c[0]).filter((n: number) => !isNaN(n));
    const lats = coords.map((c: number[]) => c[1]).filter((n: number) => !isNaN(n));

    if (lons.length === 0 || lats.length === 0) {
      console.error('[extractBboxFromGeometry] No valid coordinates found');
      return null;
    }

    const bbox = [
      Math.min(...lons), // west
      Math.min(...lats), // south
      Math.max(...lons), // east
      Math.max(...lats)  // north
    ];

    if (bbox.some(n => isNaN(n) || n === null || n === undefined)) {
      console.error('[extractBboxFromGeometry] Invalid bbox values:', bbox);
      return null;
    }

    return bbox;
  } catch (error) {
    console.error('[extractBboxFromGeometry] Failed to extract bbox:', error);
    return null;
  }
}

/**
 * Get tiles that need processing
 */
async function getTilesToProcess(supabase: any, tileIds: string[]): Promise<TileToProcess[]> {
  // Get tiles that have lands mapped to them
  const { data: tilesWithLands, error } = await supabase
    .from('mgrs_tiles')
    .select('id, tile_id, geometry, is_agri, total_lands_count')
    .eq('is_agri', true)
    .gt('total_lands_count', 0);

  if (error) {
    console.error('[getTilesToProcess] Error fetching tiles:', error);
    return [];
  }

  if (!tilesWithLands || tilesWithLands.length === 0) {
    console.log('[getTilesToProcess] No agricultural tiles with lands found');
    return [];
  }

  // Filter by tileIds if provided
  const filteredTiles = tileIds && tileIds.length > 0
    ? tilesWithLands.filter((t: any) => tileIds.includes(t.tile_id))
    : tilesWithLands;

  // Extract bbox from geometry for each tile
  const tiles: TileToProcess[] = [];
  for (const tile of filteredTiles) {
    const bbox = extractBboxFromGeometry(tile.geometry);
    if (bbox) {
      tiles.push({
        tile_id: tile.tile_id,
        mgrs_id: tile.id,
        geometry: tile.geometry,
        bbox: bbox,
      });
    } else {
      console.warn(`[getTilesToProcess] Skipping tile ${tile.tile_id} - invalid bbox`);
    }
  }

  console.log(`[getTilesToProcess] Found ${tiles.length} tiles with lands:`, tiles.map(t => t.tile_id));
  return tiles;
}

/**
 * Check if tile was recently processed (within last 7 days)
 */
async function isTileFresh(supabase: any, tileId: string): Promise<boolean> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('satellite_tiles')
    .select('last_checked')
    .eq('tile_id', tileId)
    .eq('status', 'ready')
    .gte('last_checked', sevenDaysAgo)
    .maybeSingle();

  return !!data;
}

/**
 * Process NDVI for a single tile using Copernicus APIs
 */
async function processTileNdvi(
  token: string,
  tile: TileToProcess,
  startDate: string,
  endDate: string,
  cloudCoverage: number
): Promise<NdviProcessResult> {
  const bbox = tile.bbox;
  console.log(`[processTileNdvi] Processing tile ${tile.tile_id}, bbox:`, bbox);

  // Step 1: Search Catalog API
  const catalogPayload = {
    collections: ['SENTINEL-2'],
    bbox: bbox,
    datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
    limit: 10,
    query: { 'eo:cloud_cover': { lte: cloudCoverage } }
  };

  const catalogResponse = await fetch(COPERNICUS_CATALOG_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(catalogPayload)
  });

  if (!catalogResponse.ok) {
    throw new Error(`Catalog API failed: ${catalogResponse.statusText}`);
  }

  const catalogData = await catalogResponse.json();
  
  if (!catalogData.features || catalogData.features.length === 0) {
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: endDate || new Date().toISOString().split('T')[0],
      cloudCover: 0
    };
  }

  // Filter for L2A only
  const l2aScenes = catalogData.features.filter((f: any) => f.id?.includes('MSIL2A'));
  if (l2aScenes.length === 0) {
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: endDate || new Date().toISOString().split('T')[0],
      cloudCover: 0
    };
  }

  const scene = l2aScenes.sort((a: any, b: any) => 
    (a.properties?.['eo:cloud_cover'] || 100) - (b.properties?.['eo:cloud_cover'] || 100)
  )[0];

  const acquisitionDate = scene.properties?.datetime 
    ? new Date(scene.properties.datetime).toISOString().split('T')[0]
    : endDate || new Date().toISOString().split('T')[0];
  const cloudCover = scene.properties?.['eo:cloud_cover'] || 0;

  // Step 2: Calculate statistics
  const statsResult = await calculateNDVIStats(token, bbox, startDate, endDate, cloudCoverage);
  
  if (!statsResult?.data?.[0]?.outputs?.ndvi?.bands?.B0?.stats) {
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate,
      cloudCover
    };
  }

  const statsData = statsResult.data[0].outputs.ndvi.bands.B0.stats;
  const stats: NdviStats = {
    mean: statsData.mean || 0,
    min: statsData.min || 0,
    max: statsData.max || 0,
    std: statsData.stDev || 0
  };

  // Step 3: Generate visualization
  const imageBlob = await generateNDVIVisualization(token, bbox, startDate, endDate, cloudCoverage);
  const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());

  return { imageBuffer, stats, acquisitionDate, cloudCover };
}

/**
 * Calculate NDVI statistics
 */
async function calculateNDVIStats(token: string, bbox: number[], dateFrom: string, dateTo: string, cloudCoverage: number) {
  const evalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{ bands: ["B04", "B08", "SCL"], units: "DN" }],
        output: [
          { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
          { id: "dataMask", bands: 1, sampleType: "UINT8" }
        ]
      };
    }
    function evaluatePixel(samples) {
      let isValid = [4, 5, 6, 7].includes(samples.SCL);
      if (!isValid || samples.B08 === 0 || samples.B04 === 0) {
        return { ndvi: [0], dataMask: [0] };
      }
      let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
      return { ndvi: [ndvi], dataMask: [1] };
    }
  `;

  const response = await fetch(COPERNICUS_STATISTICAL_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: bbox,
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
        },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` },
            maxCloudCoverage: cloudCoverage
          }
        }]
      },
      aggregation: {
        timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` },
        aggregationInterval: { of: "P1D" },
        evalscript: evalscript,
        resx: 1500,
        resy: 1500
      },
      calculations: {
        default: {
          statistics: {
            default: {
              percentiles: { k: [25, 50, 75] }
            }
          }
        }
      }
    })
  });

  if (!response.ok) throw new Error(`Statistical API failed: ${response.statusText}`);
  return await response.json();
}

/**
 * Generate NDVI visualization
 */
async function generateNDVIVisualization(token: string, bbox: number[], dateFrom: string, dateTo: string, cloudCoverage: number): Promise<Blob> {
  const evalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{ bands: ["B04", "B08", "SCL"], units: "DN" }],
        output: { bands: 4, sampleType: "AUTO" }
      };
    }
    function evaluatePixel(sample) {
      let isValid = [4, 5, 6, 7].includes(sample.SCL);
      if (!isValid || sample.B08 === 0 || sample.B04 === 0) return [0, 0, 0, 0];
      
      let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
      let r, g, b;
      if (ndvi < -0.1) { r = 0.5; g = 0.5; b = 1; }
      else if (ndvi < 0.1) { r = 0.9; g = 0.9; b = 0.8; }
      else if (ndvi < 0.3) { r = 1; g = 1; b = 0.5; }
      else if (ndvi < 0.5) { r = 0.8; g = 1; b = 0.4; }
      else if (ndvi < 0.7) { r = 0.2; g = 0.8; b = 0.2; }
      else { r = 0; g = 0.5; b = 0; }
      return [r, g, b, 1];
    }
  `;

  const response = await fetch(COPERNICUS_PROCESS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: bbox,
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
        },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` },
            maxCloudCoverage: cloudCoverage
          }
        }]
      },
      output: {
        width: 512,
        height: 512,
        responses: [{ identifier: "default", format: { type: "image/png" } }]
      },
      evalscript: evalscript
    })
  });

  if (!response.ok) throw new Error(`Process API failed: ${response.statusText}`);
  return await response.blob();
}

/**
 * Store NDVI data
 */
async function storeTileNdvi(tile: TileToProcess, acquisition_date: string, imageBuffer: Uint8Array, stats: NdviStats, supabase: any): Promise<string> {
  const fileName = `${tile.tile_id}/${acquisition_date}.png`;
  
  await supabase.storage.from("satellite-ndvi-tiles").upload(fileName, imageBuffer, { 
    contentType: "image/png", 
    upsert: true 
  });

  const { data: signed } = await supabase.storage.from("satellite-ndvi-tiles").createSignedUrl(fileName, 60 * 60 * 24 * 7);

  await supabase.from("satellite_tiles").upsert({
    tile_id: tile.tile_id,
    acquisition_date,
    ndvi_path: signed?.signedUrl,
    ndvi_mean: stats.mean,
    ndvi_min: stats.min,
    ndvi_max: stats.max,
    ndvi_std_dev: stats.std,
    bbox: tile.bbox,
    status: "ready",
    last_checked: new Date().toISOString(),
  }, { onConflict: "tile_id,acquisition_date" });

  return signed?.signedUrl || '';
}

/**
 * Mark tile error
 */
async function markTileError(supabase: any, tileId: string, acquisition_date: string, message: string) {
  await supabase.from("satellite_tiles").upsert({
    tile_id: tileId,
    acquisition_date,
    status: "error",
    error_message: message,
    last_checked: new Date().toISOString(),
  }, { onConflict: "tile_id,acquisition_date" });
}

/**
 * Map lands to tile
 */
async function mapLandsToTile(tileId: string, acquisitionDate: string, stats: NdviStats, ndviUrl: string, supabase: any): Promise<number> {
  const { data: lands, error } = await supabase.rpc("get_lands_by_tile", { p_tile_id: tileId });
  
  if (error || !lands || lands.length === 0) return 0;

  const records = lands.map((land: any) => ({
    land_id: land.land_id,
    farmer_id: land.farmer_id,
    tenant_id: land.tenant_id,
    acquisition_date: acquisitionDate,
    ndvi_mean: stats.mean,
    ndvi_min: stats.min,
    ndvi_max: stats.max,
    ndvi_std_dev: stats.std,
    ndvi_thumbnail_url: ndviUrl,
  }));

  await supabase.from("ndvi_micro_tiles").upsert(records, { onConflict: "land_id,acquisition_date" });
  return lands.length;
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[process-ndvi-by-tiles] Edge function v2.0 - Functions defined first');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { startDate, endDate, regions = [], tileIds = [], forceUpdate = false, cloudCoverage = 20 } = await req.json();

    console.log(`[process-ndvi-by-tiles] Starting with params:`, { startDate, endDate, tileIds, forceUpdate });

    // Get OAuth token
    const clientId = Deno.env.get("COPERNICUS_CLIENT_ID");
    const clientSecret = Deno.env.get("COPERNICUS_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error('Copernicus credentials not configured');
    }

    const token = await getCopernicusToken(clientId, clientSecret);
    console.log(`[process-ndvi-by-tiles] ✓ OAuth token obtained`);

    // Get tiles to process
    const tilesToProcess = await getTilesToProcess(supabase, tileIds);
    console.log(`[process-ndvi-by-tiles] Found ${tilesToProcess.length} tiles to process`);

    const processedTiles: ProcessedTile[] = [];
    const errors: Array<{ tile_id: string; error: string }> = [];
    let skippedCount = 0;

    for (const tile of tilesToProcess) {
      try {
        console.log(`\n[process-ndvi-by-tiles] Processing tile: ${tile.tile_id}`);

        if (!forceUpdate && await isTileFresh(supabase, tile.tile_id)) {
          console.log(`[process-ndvi-by-tiles] Skipping fresh tile: ${tile.tile_id}`);
          skippedCount++;
          continue;
        }

        // Process NDVI using proper API workflow
        const result = await processTileNdvi(token, tile, startDate, endDate, cloudCoverage);

        if (!result.imageBuffer || !result.stats) {
          console.log(`[process-ndvi-by-tiles] No data available for tile: ${tile.tile_id}`);
          await markTileError(supabase, tile.tile_id, result.acquisitionDate, "No satellite data available");
          errors.push({ tile_id: tile.tile_id, error: "No satellite data available" });
          continue;
        }

        // Store in Supabase Storage
        const storageUrl = await storeTileNdvi(tile, result.acquisitionDate, result.imageBuffer, result.stats, supabase);

        // Map lands to this tile
        const affectedLands = await mapLandsToTile(tile.tile_id, result.acquisitionDate, result.stats, storageUrl, supabase);

        processedTiles.push({
          tile_id: tile.tile_id,
          acquisition_date: result.acquisitionDate,
          cloud_cover: result.cloudCover,
          ndvi_mean: result.stats.mean,
          affected_lands: affectedLands,
          status: "success",
        });

        console.log(`[process-ndvi-by-tiles] ✓ Tile ${tile.tile_id} processed successfully, lands=${affectedLands}`);
      } catch (err: any) {
        console.error(`[process-ndvi-by-tiles] Error processing ${tile.tile_id}:`, err.message);
        await markTileError(supabase, tile.tile_id, endDate || new Date().toISOString().split('T')[0], err.message);
        errors.push({ tile_id: tile.tile_id, error: err.message });
      }
    }

    const response = {
      success: true,
      data: {
        total_tiles: tilesToProcess.length,
        processed_tiles: processedTiles.length,
        skipped_tiles: skippedCount,
        tiles: processedTiles,
        errors: errors,
      },
      message: `Successfully processed ${processedTiles.length} of ${tilesToProcess.length} tiles`
    };

    console.log(`[process-ndvi-by-tiles] Complete:`, JSON.stringify(response, null, 2));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[process-ndvi-by-tiles] Fatal error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Get OAuth2 access token from Copernicus
 */
async function getCopernicusToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(COPERNICUS_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Extract bounding box from PostGIS geometry
 */
function extractBboxFromGeometry(geometry: any): number[] | null {
  try {
    if (!geometry || !geometry.coordinates) {
      console.error('[extractBboxFromGeometry] Geometry is null or missing coordinates');
      return null;
    }

    let coords: number[][];
    
    // Handle both MultiPolygon and Polygon geometry types
    if (geometry.type === 'MultiPolygon') {
      coords = geometry.coordinates[0][0];
    } else if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0];
    } else {
      console.error('[extractBboxFromGeometry] Unsupported geometry type:', geometry.type);
      return null;
    }

    if (!coords || coords.length === 0) {
      console.error('[extractBboxFromGeometry] Coordinates array is empty');
      return null;
    }

    const lons = coords.map((c: number[]) => c[0]).filter((n: number) => !isNaN(n));
    const lats = coords.map((c: number[]) => c[1]).filter((n: number) => !isNaN(n));

    if (lons.length === 0 || lats.length === 0) {
      console.error('[extractBboxFromGeometry] No valid coordinates found');
      return null;
    }

    const bbox = [
      Math.min(...lons), // west
      Math.min(...lats), // south
      Math.max(...lons), // east
      Math.max(...lats)  // north
    ];

    if (bbox.some(n => isNaN(n) || n === null || n === undefined)) {
      console.error('[extractBboxFromGeometry] Invalid bbox values:', bbox);
      return null;
    }

    return bbox;
  } catch (error) {
    console.error('[extractBboxFromGeometry] Failed to extract bbox:', error);
    return null;
  }
}

/**
 * Get tiles that need processing
 */
async function getTilesToProcess(supabase: any, tileIds: string[]): Promise<TileToProcess[]> {
  // Get tiles that have lands mapped to them
  const { data: tilesWithLands, error } = await supabase
    .from('mgrs_tiles')
    .select('id, tile_id, geometry, is_agri, total_lands_count')
    .eq('is_agri', true)
    .gt('total_lands_count', 0);

  if (error) {
    console.error('[getTilesToProcess] Error fetching tiles:', error);
    return [];
  }

  if (!tilesWithLands || tilesWithLands.length === 0) {
    console.log('[getTilesToProcess] No agricultural tiles with lands found');
    return [];
  }

  // Filter by tileIds if provided
  const filteredTiles = tileIds && tileIds.length > 0
    ? tilesWithLands.filter((t: any) => tileIds.includes(t.tile_id))
    : tilesWithLands;

  // Extract bbox from geometry for each tile
  const tiles: TileToProcess[] = [];
  for (const tile of filteredTiles) {
    const bbox = extractBboxFromGeometry(tile.geometry);
    if (bbox) {
      tiles.push({
        tile_id: tile.tile_id,
        mgrs_id: tile.id,
        geometry: tile.geometry,
        bbox: bbox,
      });
    } else {
      console.warn(`[getTilesToProcess] Skipping tile ${tile.tile_id} - invalid bbox`);
    }
  }

  console.log(`[getTilesToProcess] Found ${tiles.length} tiles with lands:`, tiles.map(t => t.tile_id));
  return tiles;
}

/**
 * Check if tile was recently processed (within last 7 days)
 */
async function isTileFresh(supabase: any, tileId: string): Promise<boolean> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('satellite_tiles')
    .select('last_checked')
    .eq('tile_id', tileId)
    .eq('status', 'ready')
    .gte('last_checked', sevenDaysAgo)
    .maybeSingle();

  return !!data;
}

/**
 * Process NDVI for a single tile using Copernicus APIs
 * Workflow: Catalog API → Statistical API → Process API
 */
async function processTileNdvi(
  token: string,
  tile: TileToProcess,
  startDate: string,
  endDate: string,
  cloudCoverage: number
): Promise<NdviProcessResult> {
  const bbox = tile.bbox;
  console.log(`[processTileNdvi] Processing tile ${tile.tile_id}, bbox:`, bbox);

  // Step 1: Search Catalog API for available scenes
  console.log(`[Catalog API] Searching for scenes:`, {
    collections: ['SENTINEL-2'],
    bbox: bbox,
    datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
    limit: 10
  });

  const catalogPayload = {
    collections: ['SENTINEL-2'],
    bbox: bbox,
    datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
    limit: 10,
    query: {
      'eo:cloud_cover': { lte: cloudCoverage }
    }
  };

  const catalogResponse = await fetch(COPERNICUS_CATALOG_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(catalogPayload)
  });

  if (!catalogResponse.ok) {
    const errorText = await catalogResponse.text();
    console.error('[Catalog API] Error:', errorText);
    throw new Error(`Catalog API failed: ${catalogResponse.statusText}`);
  }

  const catalogData = await catalogResponse.json();
  console.log(`[Catalog API] Found ${catalogData.features?.length || 0} scenes`);

  if (!catalogData.features || catalogData.features.length === 0) {
    console.log(`[Catalog API] No scenes found for tile ${tile.tile_id}`);
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: endDate || new Date().toISOString().split('T')[0],
      cloudCover: 0
    };
  }

  // Filter for L2A products only (exclude L1C)
  const l2aScenes = catalogData.features.filter((feature: any) => {
    const sceneId = feature.id || '';
    return sceneId.includes('MSIL2A');
  });

  if (l2aScenes.length === 0) {
    console.error('[Catalog API] No L2A scenes found, only L1C available');
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: endDate || new Date().toISOString().split('T')[0],
      cloudCover: 0
    };
  }

  // Select best scene (lowest cloud cover)
  const selectedScene = l2aScenes.sort((a: any, b: any) => {
    const cloudA = a.properties?.['eo:cloud_cover'] || 100;
    const cloudB = b.properties?.['eo:cloud_cover'] || 100;
    return cloudA - cloudB;
  })[0];

  const sceneId = selectedScene.id;
  const acquisitionDate = selectedScene.properties?.datetime 
    ? new Date(selectedScene.properties.datetime).toISOString().split('T')[0]
    : endDate || new Date().toISOString().split('T')[0];
  const cloudCover = selectedScene.properties?.['eo:cloud_cover'] || 0;

  console.log(`[processTileNdvi] Selected L2A scene: ${sceneId}, date: ${acquisitionDate}, cloud: ${cloudCover}%`);

  // Step 2: Calculate NDVI statistics using Statistical API
  const statsResult = await calculateNDVIStats(token, bbox, startDate, endDate, cloudCoverage);

  if (!statsResult || !statsResult.data || statsResult.data.length === 0) {
    console.error('[Statistical API] No data returned for scene:', sceneId);
    console.error('[Statistical API] This means no valid pixels found for the bbox/date combination');
    console.log('[Statistical API] Full response:', JSON.stringify(statsResult, null, 2));
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: acquisitionDate,
      cloudCover: cloudCover
    };
  }

  const firstInterval = statsResult.data[0];
  const ndviOutput = firstInterval.outputs?.ndvi;

  if (!ndviOutput || !ndviOutput.bands || !ndviOutput.bands.B0 || !ndviOutput.bands.B0.stats) {
    console.error('[Statistical API] No NDVI stats in response');
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: acquisitionDate,
      cloudCover: cloudCover
    };
  }

  const ndviStatsData = ndviOutput.bands.B0.stats;
  const stats: NdviStats = {
    mean: ndviStatsData.mean || 0,
    min: ndviStatsData.min || 0,
    max: ndviStatsData.max || 0,
    std: ndviStatsData.stDev || 0
  };

  console.log('[Statistical API] NDVI stats:', stats);

  // Step 3: Generate visualization PNG using Process API
  const imageBlob = await generateNDVIVisualization(token, bbox, startDate, endDate, cloudCoverage);
  const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());

  console.log(`[Process API] Generated PNG: ${imageBuffer.length} bytes`);

  return {
    imageBuffer: imageBuffer,
    stats: stats,
    acquisitionDate: acquisitionDate,
    cloudCover: cloudCover
  };
}

/**
 * Calculate NDVI statistics using Statistical API
 */
async function calculateNDVIStats(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string,
  cloudCoverage: number
): Promise<any> {
  const statsEvalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{
          bands: ["B04", "B08", "SCL"],
          units: "DN"
        }],
        output: [
          { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
          { id: "dataMask", bands: 1, sampleType: "UINT8" }
        ]
      };
    }
    
    function evaluatePixel(samples) {
      // Mask out clouds, cloud shadows, and invalid pixels using SCL
      // SCL values: 4=vegetation, 5=not-vegetated, 6=water, 7=unclassified
      // 8=cloud medium probability, 9=cloud high probability, 3=cloud shadows
      let isValid = [4, 5, 6, 7].includes(samples.SCL);
      
      if (!isValid || samples.B08 === 0 || samples.B04 === 0) {
        return {
          ndvi: [0],
          dataMask: [0]
        };
      }
      
      let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
      return {
        ndvi: [ndvi],
        dataMask: [1]
      };
    }
  `;

  const bboxWidth = bbox[2] - bbox[0];
  const bboxHeight = bbox[3] - bbox[1];
  const widthMeters = bboxWidth * 111320;
  const heightMeters = bboxHeight * 110570;
  
  const maxResolution = 1500; // meters per pixel
  let width = Math.max(64, Math.ceil(widthMeters / maxResolution));
  let height = Math.max(64, Math.ceil(heightMeters / maxResolution));
  
  // Cap at reasonable limits
  width = Math.min(width, 2048);
  height = Math.min(height, 2048);

  const statsPayload = {
    input: {
      bounds: {
        bbox: bbox,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` },
          maxCloudCoverage: cloudCoverage
        }
      }]
    },
    aggregation: {
      timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` },
      aggregationInterval: { of: "P1D" },
      evalscript: statsEvalscript,
      resx: maxResolution,
      resy: maxResolution
    },
    calculations: {
      default: {
        statistics: {
          default: {
            percentiles: {
              k: [25, 50, 75]
            }
          }
        }
      }
    }
  };

  console.log('[Statistical API] Request payload prepared');

  const response = await fetch(COPERNICUS_STATISTICAL_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(statsPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Statistical API] Error:', errorText);
    throw new Error(`Statistical API failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Generate NDVI visualization using Process API
 */
async function generateNDVIVisualization(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string,
  cloudCoverage: number
): Promise<Blob> {
  const evalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{
          bands: ["B04", "B08", "SCL"],
          units: "DN"
        }],
        output: {
          bands: 4,
          sampleType: "AUTO"
        }
      };
    }
    
    function evaluatePixel(sample) {
      // Mask clouds using SCL
      let isValid = [4, 5, 6, 7].includes(sample.SCL);
      
      if (!isValid || sample.B08 === 0 || sample.B04 === 0) {
        return [0, 0, 0, 0]; // Transparent
      }
      
      let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
      
      // Color mapping for NDVI
      let r, g, b;
      if (ndvi < -0.1) {
        r = 0.5; g = 0.5; b = 1; // Water - blue
      } else if (ndvi < 0.1) {
        r = 0.9; g = 0.9; b = 0.8; // Bare soil - beige
      } else if (ndvi < 0.3) {
        r = 1; g = 1; b = 0.5; // Sparse vegetation - yellow
      } else if (ndvi < 0.5) {
        r = 0.8; g = 1; b = 0.4; // Moderate - light green
      } else if (ndvi < 0.7) {
        r = 0.2; g = 0.8; b = 0.2; // Dense - green
      } else {
        r = 0; g = 0.5; b = 0; // Very dense - dark green
      }
      
      return [r, g, b, 1];
    }
  `;

  const processPayload = {
    input: {
      bounds: {
        bbox: bbox,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` },
          maxCloudCoverage: cloudCoverage
        }
      }]
    },
    output: {
      width: 512,
      height: 512,
      responses: [{
        identifier: "default",
        format: { type: "image/png" }
      }]
    },
    evalscript: evalscript
  };

  console.log('[Process API] Generating NDVI visualization...');

  const response = await fetch(COPERNICUS_PROCESS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(processPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Process API] Error:', errorText);
    throw new Error(`Process API failed: ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * Store NDVI data in Supabase Storage and database
 */
async function storeTileNdvi(
  tile: TileToProcess,
  acquisition_date: string,
  imageBuffer: Uint8Array,
  stats: NdviStats,
  supabase: any
): Promise<string> {
  const fileName = `${tile.tile_id}/${acquisition_date}.png`;
  
  const { error: uploadError } = await supabase.storage
    .from("satellite-ndvi-tiles")
    .upload(fileName, imageBuffer, { contentType: "image/png", upsert: true });

  if (uploadError) {
    console.error('[storeTileNdvi] Upload error:', uploadError);
    throw new Error(uploadError.message);
  }

  const { data: signed } = await supabase.storage
    .from("satellite-ndvi-tiles")
    .createSignedUrl(fileName, 60 * 60 * 24 * 7);

  // Save to DB
  const { error: dbError } = await supabase.from("satellite_tiles").upsert({
    tile_id: tile.tile_id,
    acquisition_date,
    ndvi_path: signed?.signedUrl,
    ndvi_mean: stats.mean,
    ndvi_min: stats.min,
    ndvi_max: stats.max,
    ndvi_std_dev: stats.std,
    bbox: tile.bbox,
    status: "ready",
    last_checked: new Date().toISOString(),
  }, { onConflict: "tile_id,acquisition_date" });

  if (dbError) {
    console.error('[storeTileNdvi] DB error:', dbError);
  }

  console.log(`[storeTileNdvi] Stored tile ${tile.tile_id} to storage and DB`);
  return signed?.signedUrl || '';
}

/**
 * Mark tile as having an error
 */
async function markTileError(supabase: any, tileId: string, acquisition_date: string, message: string) {
  await supabase.from("satellite_tiles").upsert({
    tile_id: tileId,
    acquisition_date,
    status: "error",
    error_message: message,
    last_checked: new Date().toISOString(),
  }, { onConflict: "tile_id,acquisition_date" });
}

/**
 * Map NDVI data to individual lands within the tile
 */
async function mapLandsToTile(
  tileId: string,
  acquisitionDate: string,
  stats: NdviStats,
  ndviUrl: string,
  supabase: any
): Promise<number> {
  const { data: lands, error } = await supabase.rpc("get_lands_by_tile", { p_tile_id: tileId });
  
  if (error) {
    console.error('[mapLandsToTile] RPC error:', error);
    return 0;
  }

  if (!lands || lands.length === 0) {
    console.log(`[mapLandsToTile] No lands found for tile ${tileId}`);
    return 0;
  }

  const records = lands.map((land: any) => ({
    land_id: land.land_id,
    farmer_id: land.farmer_id,
    tenant_id: land.tenant_id,
    acquisition_date: acquisitionDate,
    ndvi_mean: stats.mean,
    ndvi_min: stats.min,
    ndvi_max: stats.max,
    ndvi_std_dev: stats.std,
    ndvi_thumbnail_url: ndviUrl,
  }));

  const { error: upsertError } = await supabase
    .from("ndvi_micro_tiles")
    .upsert(records, { onConflict: "land_id,acquisition_date" });

  if (upsertError) {
    console.error('[mapLandsToTile] Upsert error:', upsertError);
    return 0;
  }

  console.log(`[mapLandsToTile] Mapped ${lands.length} lands for tile ${tileId}`);
  return lands.length;
}
