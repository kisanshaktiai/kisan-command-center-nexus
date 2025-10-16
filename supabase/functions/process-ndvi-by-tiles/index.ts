// functions/process-ndvi-by-tiles/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

// API endpoints
const COPERNICUS_CATALOG_API = 'https://catalogue.dataspace.copernicus.eu/stac/search';
const COPERNICUS_PROCESS_API = 'https://sh.dataspace.copernicus.eu/api/v1/process';
const COPERNICUS_STATISTICAL_API = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';
const COPERNICUS_AUTH_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const PLANETARY_COMPUTER_API = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';

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
  dataSource: 'copernicus' | 'planetary_computer' | 'fallback';
}

// ==================== AUTHENTICATION ====================

async function getCopernicusToken(clientId: string, clientSecret: string): Promise<string> {
  console.log('[getCopernicusToken] Requesting token...');
  
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
    const errorText = await response.text();
    console.error('[getCopernicusToken] Auth failed:', errorText);
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[getCopernicusToken] ✓ Token obtained');
  return data.access_token;
}

// ==================== GEOMETRY HELPERS ====================

function extractBboxFromGeometry(geometry: any): number[] | null {
  try {
    if (!geometry || !geometry.coordinates) {
      console.error('[extractBboxFromGeometry] Invalid geometry');
      return null;
    }

    let coords: number[][];
    
    if (geometry.type === 'MultiPolygon') {
      coords = geometry.coordinates[0][0];
    } else if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0];
    } else {
      console.error('[extractBboxFromGeometry] Unsupported type:', geometry.type);
      return null;
    }

    if (!coords || coords.length === 0) return null;

    const lons = coords.map((c: number[]) => c[0]).filter((n: number) => !isNaN(n));
    const lats = coords.map((c: number[]) => c[1]).filter((n: number) => !isNaN(n));

    if (lons.length === 0 || lats.length === 0) return null;

    return [
      Math.min(...lons),
      Math.min(...lats),
      Math.max(...lons),
      Math.max(...lats)
    ];
  } catch (error) {
    console.error('[extractBboxFromGeometry] Error:', error);
    return null;
  }
}

function calculateBboxAreaKm2(bbox: number[]): number {
  const width = bbox[2] - bbox[0];
  const height = bbox[3] - bbox[1];
  // Approximate: 1 degree ≈ 111 km at equator
  return width * 111.0 * height * 111.0;
}

// ==================== DATA RETRIEVAL ====================

async function getTilesToProcess(supabase: any, tileIds: string[]): Promise<TileToProcess[]> {
  console.log('[getTilesToProcess] Fetching tiles that intersect with land boundaries...');
  
  // Use the new function to only get tiles that contain farmer lands
  const { data: tilesWithLands, error } = tileIds && tileIds.length > 0
    ? await supabase.rpc('get_tiles_intersecting_lands', { tile_ids: tileIds })
    : await supabase.rpc('get_tiles_intersecting_lands');

  if (error) {
    console.error('[getTilesToProcess] Error:', error);
    return [];
  }

  if (!tilesWithLands || tilesWithLands.length === 0) {
    console.log('[getTilesToProcess] No agricultural tiles found');
    return [];
  }

  const filteredTiles = tileIds && tileIds.length > 0
    ? tilesWithLands.filter((t: any) => tileIds.includes(t.tile_id))
    : tilesWithLands;

  const tiles: TileToProcess[] = [];
  
  for (const tile of filteredTiles) {
    if (!tile.geometry) {
      console.warn(`[getTilesToProcess] Skipping ${tile.tile_id} - no geometry`);
      continue;
    }

    // Try RPC function first
    const { data: bboxArray, error: bboxError } = await supabase
      .rpc('get_geometry_bbox', { geom: tile.geometry });

    let bbox: number[];
    
    if (bboxError || !bboxArray) {
      console.warn(`[getTilesToProcess] RPC failed for ${tile.tile_id}, extracting manually`);
      const manualBbox = extractBboxFromGeometry(tile.geometry);
      if (!manualBbox) {
        console.warn(`[getTilesToProcess] Skipping ${tile.tile_id} - bbox extraction failed`);
        continue;
      }
      bbox = manualBbox;
    } else {
      bbox = bboxArray.map((val: string) => parseFloat(val));
    }

    const areaKm2 = calculateBboxAreaKm2(bbox);
    console.log(`[getTilesToProcess] ${tile.tile_id}: ${areaKm2.toFixed(2)} km²`);
    
    tiles.push({
      tile_id: tile.tile_id,
      mgrs_id: tile.id,
      geometry: tile.geometry,
      bbox: bbox,
    });
  }

  console.log(`[getTilesToProcess] ✓ Found ${tiles.length} tiles`);
  return tiles;
}

async function isTileFresh(supabase: any, tileId: string): Promise<boolean> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('satellite_tiles')
    .select('updated_at')
    .eq('tile_id', tileId)
    .eq('status', 'completed')
    .gte('updated_at', sevenDaysAgo)
    .maybeSingle();

  return !!data;
}

// ==================== COPERNICUS DATA SEARCH ====================

async function searchCopernicusCatalog(
  bbox: number[],
  startDate: string,
  endDate: string
): Promise<any> {
  console.log('[searchCopernicusCatalog] Searching...');
  console.log('  bbox:', bbox);
  console.log('  dates:', `${startDate} to ${endDate}`);
  
  // Fix: Ensure proper ISO 8601 format with timezone
  const dateTimeFrom = `${startDate}T00:00:00Z`;
  const dateTimeTo = `${endDate}T23:59:59Z`;
  
  const payload = {
    collections: ['SENTINEL-2'],
    bbox: bbox,
    datetime: `${dateTimeFrom}/${dateTimeTo}`,
    limit: 50,
    // Add query to filter by processing level
    query: {
      's2:processing_baseline': { 'gte': '02.00' } // L2A products
    }
  };

  console.log('[searchCopernicusCatalog] Request:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(COPERNICUS_CATALOG_API, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[searchCopernicusCatalog] Response status:', response.status);
    console.log('[searchCopernicusCatalog] Response preview:', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('[searchCopernicusCatalog] Error response:', responseText);
      return null;
    }

    const data = JSON.parse(responseText);
    console.log('[searchCopernicusCatalog] Found features:', data.features?.length || 0);
    
    return data;
  } catch (error) {
    console.error('[searchCopernicusCatalog] Exception:', error);
    return null;
  }
}

// ==================== PLANETARY COMPUTER SEARCH ====================

async function searchPlanetaryComputer(
  bbox: number[],
  startDate: string,
  endDate: string,
  maxCloudCover: number
): Promise<any> {
  console.log('[searchPlanetaryComputer] Searching...');
  console.log('  bbox:', bbox);
  console.log('  dates:', `${startDate} to ${endDate}`);
  console.log('  max cloud:', maxCloudCover);
  
  const payload = {
    collections: ['sentinel-2-l2a'],
    bbox: bbox,
    datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
    limit: 50,
    query: {
      'eo:cloud_cover': { 'lte': maxCloudCover }
    },
    sortby: [
      { field: 'eo:cloud_cover', direction: 'asc' },
      { field: 'datetime', direction: 'desc' }
    ]
  };

  console.log('[searchPlanetaryComputer] Request:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(PLANETARY_COMPUTER_API, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[searchPlanetaryComputer] Response status:', response.status);
    console.log('[searchPlanetaryComputer] Response preview:', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('[searchPlanetaryComputer] Error:', responseText);
      return null;
    }

    const data = JSON.parse(responseText);
    console.log('[searchPlanetaryComputer] Found features:', data.features?.length || 0);
    
    return data;
  } catch (error) {
    console.error('[searchPlanetaryComputer] Exception:', error);
    return null;
  }
}

// ==================== MULTI-STRATEGY SEARCH ====================

async function findBestSatelliteScene(
  bbox: number[],
  startDate: string,
  endDate: string,
  maxCloudCover: number
): Promise<{ scene: any; source: 'copernicus' | 'planetary_computer' } | null> {
  console.log('[findBestSatelliteScene] Starting multi-source search...');
  
  // Expand date ranges progressively
  const dateRanges = [
    { start: startDate, end: endDate, label: 'Requested' },
    { 
      start: new Date(new Date(endDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
      end: endDate, 
      label: '30 days' 
    },
    { 
      start: new Date(new Date(endDate).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
      end: endDate, 
      label: '90 days' 
    },
  ];

  // Progressive cloud cover thresholds
  const cloudThresholds = [maxCloudCover, 40, 60, 80, 100];

  for (const dateRange of dateRanges) {
    for (const cloudThreshold of cloudThresholds) {
      console.log(`[findBestSatelliteScene] Trying ${dateRange.label}, cloud <= ${cloudThreshold}%`);
      
      // Try Copernicus first
      const copernicusData = await searchCopernicusCatalog(bbox, dateRange.start, dateRange.end);
      
      if (copernicusData?.features?.length > 0) {
        const l2aScenes = copernicusData.features.filter((f: any) => 
          f.id?.includes('MSIL2A') && 
          (f.properties?.['eo:cloud_cover'] || 100) <= cloudThreshold
        );
        
        if (l2aScenes.length > 0) {
          const bestScene = l2aScenes.sort((a: any, b: any) => 
            (a.properties?.['eo:cloud_cover'] || 100) - (b.properties?.['eo:cloud_cover'] || 100)
          )[0];
          
          console.log('[findBestSatelliteScene] ✓ Found Copernicus scene:', {
            id: bestScene.id,
            date: bestScene.properties?.datetime,
            cloud: bestScene.properties?.['eo:cloud_cover']
          });
          
          return { scene: bestScene, source: 'copernicus' };
        }
      }
      
      // Try Planetary Computer
      const pcData = await searchPlanetaryComputer(bbox, dateRange.start, dateRange.end, cloudThreshold);
      
      if (pcData?.features?.length > 0) {
        const bestScene = pcData.features[0];
        
        console.log('[findBestSatelliteScene] ✓ Found Planetary Computer scene:', {
          id: bestScene.id,
          date: bestScene.properties?.datetime,
          cloud: bestScene.properties?.['eo:cloud_cover']
        });
        
        return { scene: bestScene, source: 'planetary_computer' };
      }
    }
  }

  console.log('[findBestSatelliteScene] ✗ No scenes found');
  return null;
}

// ==================== NDVI CALCULATION ====================

async function calculateNDVIStats(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string,
  cloudCoverage: number
): Promise<any> {
  console.log('[calculateNDVIStats] Requesting statistics...');
  
  const evalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{
          bands: ["B04", "B08", "SCL", "dataMask"],
          units: "REFLECTANCE"
        }],
        output: [
          { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
          { id: "dataMask", bands: 1, sampleType: "UINT8" }
        ]
      };
    }
    function evaluatePixel(samples) {
      if (samples.dataMask == 0) {
        return { ndvi: [NaN], dataMask: [0] };
      }
      
      let isValid = [4, 5, 6, 7].includes(samples.SCL);
      if (!isValid || samples.B08 == 0 || samples.B04 == 0) {
        return { ndvi: [NaN], dataMask: [0] };
      }
      
      let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
      return { ndvi: [ndvi], dataMask: [1] };
    }
  `;

  const payload = {
    input: {
      bounds: {
        bbox: bbox,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: { 
            from: `${dateFrom}T00:00:00Z`, 
            to: `${dateTo}T23:59:59Z` 
          },
          maxCloudCoverage: cloudCoverage,
          mosaickingOrder: "leastCC" // Least cloud cover first
        }
      }]
    },
    aggregation: {
      timeRange: { 
        from: `${dateFrom}T00:00:00Z`, 
        to: `${dateTo}T23:59:59Z` 
      },
      aggregationInterval: { of: "P1D" },
      evalscript: evalscript,
      resx: 60,
      resy: 60
    },
    calculations: {
      ndvi: {
        statistics: {
          default: {
            percentiles: { k: [10, 25, 50, 75, 90] }
          }
        }
      }
    }
  };

  console.log('[calculateNDVIStats] Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(COPERNICUS_STATISTICAL_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  console.log('[calculateNDVIStats] Response status:', response.status);
  console.log('[calculateNDVIStats] Response preview:', responseText.substring(0, 500));

  if (!response.ok) {
    console.error('[calculateNDVIStats] Error:', responseText);
    throw new Error(`Statistical API failed: ${response.statusText}`);
  }

  const result = JSON.parse(responseText);
  console.log('[calculateNDVIStats] ✓ Stats retrieved');
  return result;
}

async function generateNDVIVisualization(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string,
  cloudCoverage: number
): Promise<Blob> {
  console.log('[generateNDVIVisualization] Generating image...');
  
  const evalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{ bands: ["B04", "B08", "SCL"], units: "REFLECTANCE" }],
        output: { bands: 4, sampleType: "AUTO" }
      };
    }
    function evaluatePixel(sample) {
      let isValid = [4, 5, 6, 7].includes(sample.SCL);
      if (!isValid || sample.B08 == 0 || sample.B04 == 0) {
        return [0, 0, 0, 0];
      }
      
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
            timeRange: { 
              from: `${dateFrom}T00:00:00Z`, 
              to: `${dateTo}T23:59:59Z` 
            },
            maxCloudCoverage: cloudCoverage,
            mosaickingOrder: "leastCC"
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generateNDVIVisualization] Error:', errorText);
    throw new Error(`Process API failed: ${response.statusText}`);
  }

  console.log('[generateNDVIVisualization] ✓ Image generated');
  return await response.blob();
}

// ==================== MAIN PROCESSING ====================

async function processTileNdvi(
  token: string,
  tile: TileToProcess,
  startDate: string,
  endDate: string,
  cloudCoverage: number
): Promise<NdviProcessResult> {
  console.log(`\n[processTileNdvi] Processing ${tile.tile_id}`);
  
  const bbox = tile.bbox;
  const areaKm2 = calculateBboxAreaKm2(bbox);
  
  console.log(`[processTileNdvi] Bbox: ${bbox}`);
  console.log(`[processTileNdvi] Area: ${areaKm2.toFixed(2)} km²`);
  
  // Check if tile is too large (> 150 km² to be safe)
  if (areaKm2 > 150) {
    console.warn(`[processTileNdvi] Tile too large (${areaKm2.toFixed(2)} km²)`);
    throw new Error(`Tile too large for processing: ${areaKm2.toFixed(2)} km²`);
  }

  // Find best scene from multiple sources
  const sceneResult = await findBestSatelliteScene(bbox, startDate, endDate, cloudCoverage);
  
  if (!sceneResult) {
    console.log('[processTileNdvi] No satellite data found');
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: endDate,
      cloudCover: 0,
      dataSource: 'fallback'
    };
  }

  const { scene, source } = sceneResult;
  const acquisitionDate = scene.properties?.datetime 
    ? new Date(scene.properties.datetime).toISOString().split('T')[0]
    : endDate;
  const cloudCover = scene.properties?.['eo:cloud_cover'] || 0;

  console.log(`[processTileNdvi] Using ${source} scene from ${acquisitionDate} (${cloudCover}% cloud)`);

  // Calculate statistics
  const statsResult = await calculateNDVIStats(token, bbox, startDate, endDate, Math.max(cloudCover + 10, cloudCoverage));
  
  if (!statsResult?.data?.[0]?.outputs?.ndvi?.bands?.B0?.stats) {
    console.warn('[processTileNdvi] No statistics returned');
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate,
      cloudCover,
      dataSource: source
    };
  }

  const statsData = statsResult.data[0].outputs.ndvi.bands.B0.stats;
  const stats: NdviStats = {
    mean: statsData.mean || 0,
    min: statsData.min || 0,
    max: statsData.max || 0,
    std: statsData.stDev || 0
  };

  console.log(`[processTileNdvi] Stats: mean=${stats.mean.toFixed(3)}, min=${stats.min.toFixed(3)}, max=${stats.max.toFixed(3)}`);

  // Generate visualization
  const imageBlob = await generateNDVIVisualization(token, bbox, startDate, endDate, Math.max(cloudCover + 10, cloudCoverage));
  const imageBuffer = new Uint8Array(await imageBlob.arrayBuffer());

  console.log(`[processTileNdvi] ✓ Complete`);

  return { 
    imageBuffer, 
    stats, 
    acquisitionDate, 
    cloudCover,
    dataSource: source
  };
}

// ==================== STORAGE ====================

async function storeTileNdvi(
  tile: TileToProcess,
  acquisition_date: string,
  imageBuffer: Uint8Array,
  stats: NdviStats,
  supabase: any,
  cloudCover: number,
  dataSource: string
): Promise<string> {
  const fileName = `${tile.tile_id}/${acquisition_date}.png`;
  
  const { error: uploadError } = await supabase.storage
    .from("satellite-ndvi-tiles")
    .upload(fileName, imageBuffer, { 
      contentType: "image/png", 
      upsert: true 
    });

  if (uploadError) {
    console.error('[storeTileNdvi] Upload error:', uploadError);
    throw uploadError;
  }

  const { data: signed } = await supabase.storage
    .from("satellite-ndvi-tiles")
    .createSignedUrl(fileName, 60 * 60 * 24 * 7);

  const dataQuality = cloudCover > 50 ? 'poor' : cloudCover > 30 ? 'fair' : 'good';

  const { error: upsertError } = await supabase
    .from("satellite_tiles")
    .upsert({
      tile_id: tile.tile_id,
      acquisition_date,
      ndvi_path: signed?.signedUrl,
      ndvi_mean: stats.mean,
      ndvi_min: stats.min,
      ndvi_max: stats.max,
      ndvi_std_dev: stats.std,
      status: "completed",
      cloud_cover: cloudCover,
      collection: 'sentinel-2-l2a',
      processing_level: 'L2A',
      country_id: 'IN',
      updated_at: new Date().toISOString(),
      data_quality_score: dataQuality,
      data_source: dataSource,
      metadata: {
        cloud_cover: cloudCover,
        data_quality: dataQuality
      }
    }, { onConflict: "tile_id,acquisition_date" });

  if (upsertError) {
    console.error('[storeTileNdvi] Upsert error:', upsertError);
    throw upsertError;
  }

  console.log('[storeTileNdvi] ✓ Stored');
  return signed?.signedUrl || '';
}

async function markTileError(
  supabase: any,
  tileId: string,
  acquisition_date: string,
  message: string
) {
  await supabase.from("satellite_tiles").upsert({
    tile_id: tileId,
    acquisition_date,
    status: "error",
    error_message: message,
    updated_at: new Date().toISOString(),
  }, { onConflict: "tile_id,acquisition_date" });
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('\n========================================');
    console.log('[MAIN] Edge Function Start');
    console.log('========================================\n');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      startDate, 
      endDate, 
      tileIds = [], 
      forceUpdate = false, 
      cloudCoverage = 30 
    } = await req.json();

    console.log('[MAIN] Parameters:', {
      startDate,
      endDate,
      tileIds,
      forceUpdate,
      cloudCoverage
    });

    // Get Copernicus token
    const clientId = Deno.env.get("COPERNICUS_CLIENT_ID");
    const clientSecret = Deno.env.get("COPERNICUS_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error('Copernicus credentials not configured');
    }

    const token = await getCopernicusToken(clientId, clientSecret);

    // Get tiles
    const tilesToProcess = await getTilesToProcess(supabase, tileIds);
    
    if (tilesToProcess.length === 0) {
      throw new Error('No tiles found to process');
    }

    const processedTiles: any[] = [];
    const errors: any[] = [];
    let skippedCount = 0;

    for (const tile of tilesToProcess) {
      try {
        if (!forceUpdate && await isTileFresh(supabase, tile.tile_id)) {
          console.log(`[MAIN] Skipping fresh tile: ${tile.tile_id}`);
          skippedCount++;
          continue;
        }

        const result = await processTileNdvi(
          token,
          tile,
          startDate,
          endDate,
          cloudCoverage
        );

        if (!result.imageBuffer || !result.stats) {
          console.log(`[MAIN] No data for tile: ${tile.tile_id}`);
          await markTileError(
            supabase,
            tile.tile_id,
            result.acquisitionDate,
            "No satellite data available"
          );
          errors.push({
            tile_id: tile.tile_id,
            error: "No satellite data available"
          });
          continue;
        }

        const storageUrl = await storeTileNdvi(
          tile,
          result.acquisitionDate,
          result.imageBuffer,
          result.stats,
          supabase,
          result.cloudCover,
          result.dataSource
        );

        processedTiles.push({
          tile_id: tile.tile_id,
          acquisition_date: result.acquisitionDate,
          cloud_cover: result.cloudCover,
          ndvi_mean: result.stats.mean,
          data_source: result.dataSource,
          status: "success",
        });

        console.log(`[MAIN] ✓ ${tile.tile_id} processed successfully`);

      } catch (err: any) {
        console.error(`[MAIN] Error processing ${tile.tile_id}:`, err.message);
        await markTileError(
          supabase,
          tile.tile_id,
          endDate || new Date().toISOString().split('T')[0],
          err.message
        );
        errors.push({
          tile_id: tile.tile_id,
          error: err.message
        });
      }
    }

    const response = {
      success: true,
      data: {
        total_tiles: tilesToProcess.length,
        processed_tiles: processedTiles.length,
        skipped_tiles: skippedCount,
        failed_tiles: errors.length,
        tiles: processedTiles,
        errors: errors,
      },
      message: `Processed ${processedTiles.length}/${tilesToProcess.length} tiles`
    };

    console.log('\n========================================');
    console.log('[MAIN] Summary:', response.message);
    console.log('========================================\n');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('\n[MAIN] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});