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
 * Multi-strategy NDVI data retrieval with progressive fallbacks
 */
async function processTileNdviMultiStrategy(
  token: string,
  tile: TileToProcess,
  startDate: string,
  endDate: string,
  cloudCoverage: number,
  supabase: any
): Promise<NdviProcessResult> {
  // Strategy 1: Expanded date ranges (30, 90, 180 days)
  const dateRanges = [
    { start: startDate, end: endDate, label: 'Requested Period' },
    { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: endDate, label: '90 Days' },
    { start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: endDate, label: '6 Months (Historical)' }
  ];

  // Strategy 2: Progressive cloud cover relaxation + accept ANY
  const cloudThresholds = [cloudCoverage, 30, 50, 80, 100];

  console.log(`[processTileNdviMultiStrategy] Starting multi-strategy NDVI retrieval for tile ${tile.tile_id}`);

  // Try each strategy combination
  for (const dateRange of dateRanges) {
    for (const cloudThreshold of cloudThresholds) {
      const isHistorical = dateRange.label.includes('Historical') || cloudThreshold === 100;
      console.log(`[processTileNdviMultiStrategy] Trying ${dateRange.label} with cloud cover <= ${cloudThreshold}%${isHistorical ? ' (HISTORICAL/DEGRADED)' : ''}`);
      
      try {
        const result = await processTileNdvi(token, tile, dateRange.start, dateRange.end, cloudThreshold, isHistorical);
        
        if (result.imageBuffer && result.stats) {
          console.log(`[processTileNdviMultiStrategy] ✓ Success with ${dateRange.label}, cloud <= ${cloudThreshold}%`);
          return result;
        }
      } catch (error) {
        // Check if it's a "too large" error - if so, fallback to land-first immediately
        if (error.message?.includes('too large')) {
          console.log(`[processTileNdviMultiStrategy] Tile too large, falling back to land-first processing`);
          return await fallbackToLandFirst(supabase, tile, token, startDate, endDate);
        }
        console.warn(`[processTileNdviMultiStrategy] Failed with ${dateRange.label}, cloud <= ${cloudThreshold}%:`, error.message);
      }
    }
  }

  // Strategy 3: Fallback to land-first processing if no data found
  console.log(`[processTileNdviMultiStrategy] All strategies failed, falling back to land-first processing`);
  return await fallbackToLandFirst(supabase, tile, token, startDate, endDate);
}

/**
 * Fallback to land-first processing for large tiles or when no data available
 */
async function fallbackToLandFirst(
  supabase: any, 
  tile: TileToProcess, 
  token: string,
  startDate: string,
  endDate: string
): Promise<NdviProcessResult> {
  console.log(`[fallbackToLandFirst] Processing lands within tile ${tile.tile_id}`);
  
  // Get all lands in this tile
  const { data: lands, error: landsError } = await supabase.rpc('get_lands_by_tile', { p_tile_id: tile.tile_id });
  
  if (landsError || !lands || lands.length === 0) {
    console.log(`[fallbackToLandFirst] No lands found for tile ${tile.tile_id}:`, landsError?.message);
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: new Date().toISOString().split('T')[0],
      cloudCover: 0
    };
  }

  console.log(`[fallbackToLandFirst] Found ${lands.length} lands in tile ${tile.tile_id}`);

  // TIER 1 FIX: Ensure clusters are created before processing
  const tenantId = lands[0].tenant_id;
  console.log(`[fallbackToLandFirst] Creating/refreshing clusters for tenant ${tenantId}`);
  
  const { error: clusterError } = await supabase.rpc('cluster_lands_for_ndvi', {
    p_tenant_id: tenantId,
    p_max_distance_km: 1.0,
    p_max_cluster_area_km2: 25.0
  });

  if (clusterError) {
    console.error(`[fallbackToLandFirst] Clustering RPC failed:`, clusterError.message);
    // Continue anyway - try to process individual lands
  } else {
    console.log(`[fallbackToLandFirst] ✓ Clusters created/refreshed`);
  }

  // Fetch the clusters
  const { data: clusters } = await supabase
    .from('land_clusters')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!clusters || clusters.length === 0) {
    console.log(`[fallbackToLandFirst] No clusters found, processing lands individually`);
    // Fallback: Process individual lands without clustering
    return await processIndividualLands(supabase, lands, token, startDate, endDate);
  }

  console.log(`[fallbackToLandFirst] Found ${clusters.length} clusters to process`);

  // Process clusters
  const allResults: any[] = [];
  for (const cluster of clusters.slice(0, 3)) { // Process up to 3 clusters
    const landIds = cluster.land_ids.filter((id: string) => lands.some((l: any) => l.land_id === id));
    
    if (landIds.length === 0) continue;

    console.log(`[fallbackToLandFirst] Processing cluster with ${landIds.length} lands`);

    const results = await processClusterNdviInline(supabase, {
      ...cluster,
      land_ids: landIds
    }, tenantId, token, startDate, endDate);

    allResults.push(...results);
  }

  if (allResults.length === 0) {
    console.log(`[fallbackToLandFirst] No results from cluster processing`);
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: new Date().toISOString().split('T')[0],
      cloudCover: 0
    };
  }

  // Aggregate stats from all lands
  const avgStats = {
    mean: allResults.reduce((sum, r) => sum + r.ndvi_mean, 0) / allResults.length,
    min: Math.min(...allResults.map(r => r.ndvi_min)),
    max: Math.max(...allResults.map(r => r.ndvi_max)),
    std: Math.sqrt(allResults.reduce((sum, r) => sum + Math.pow(r.ndvi_stddev, 2), 0) / allResults.length)
  };

  console.log(`[fallbackToLandFirst] ✓ Processed ${allResults.length} lands with avg NDVI: ${avgStats.mean.toFixed(3)}`);

  return {
    imageBuffer: null, // No tile-wide image, only land-specific data
    stats: avgStats,
    acquisitionDate: allResults[0].acquisition_date,
    cloudCover: allResults[0].cloud_coverage
  };
}

/**
 * Process individual lands when clustering fails
 */
async function processIndividualLands(
  supabase: any,
  lands: any[],
  token: string,
  startDate: string,
  endDate: string
): Promise<NdviProcessResult> {
  console.log(`[processIndividualLands] Processing ${lands.length} individual lands`);
  
  const results: any[] = [];
  
  // Process up to 5 lands individually
  for (const land of lands.slice(0, 5)) {
    try {
      const { data: landData } = await supabase
        .from('lands')
        .select('boundary')
        .eq('id', land.land_id)
        .single();
      
      if (!landData?.boundary) continue;

      const result = await processClusterNdviInline(
        supabase,
        {
          cluster_bbox: extractBboxFromGeometry(landData.boundary),
          land_ids: [land.land_id]
        },
        land.tenant_id,
        token,
        startDate,
        endDate
      );
      
      results.push(...result);
    } catch (error) {
      console.warn(`[processIndividualLands] Failed to process land ${land.land_id}:`, error.message);
    }
  }

  if (results.length === 0) {
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: new Date().toISOString().split('T')[0],
      cloudCover: 0
    };
  }

  const avgStats = {
    mean: results.reduce((sum, r) => sum + r.ndvi_mean, 0) / results.length,
    min: Math.min(...results.map(r => r.ndvi_min)),
    max: Math.max(...results.map(r => r.ndvi_max)),
    std: Math.sqrt(results.reduce((sum, r) => sum + Math.pow(r.ndvi_stddev, 2), 0) / results.length)
  };

  return {
    imageBuffer: null,
    stats: avgStats,
    acquisitionDate: results[0].acquisition_date,
    cloudCover: results[0].cloud_coverage
  };
}

/**
 * Inline cluster processing with historical fallback (extracted from process-ndvi-by-lands)
 */
async function processClusterNdviInline(
  supabase: any,
  cluster: any,
  tenantId: string,
  token: string,
  startDate?: string,
  endDate?: string
): Promise<Array<{ land_id: string; ndvi_mean: number; ndvi_min: number; ndvi_max: number; ndvi_stddev: number; acquisition_date: string; cloud_coverage: number }>> {
  const results: any[] = [];

  // TIER 2 FIX: Use provided date range or expand to 6 months
  const defaultEndDate = endDate || new Date().toISOString().split('T')[0];
  const defaultStartDate = startDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log(`[processClusterNdviInline] Searching for imagery from ${defaultStartDate} to ${defaultEndDate}`);

  // Search for Sentinel-2 imagery with expanded date range
  const catalogPayload = {
    collections: ['SENTINEL-2'],
    bbox: cluster.cluster_bbox,
    datetime: `${defaultStartDate}/${defaultEndDate}`,
    limit: 20 // Increase limit to find more options
  };

  const catalogResponse = await fetch(COPERNICUS_CATALOG_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(catalogPayload),
  });

  if (!catalogResponse.ok) {
    console.error(`[processClusterNdviInline] Catalog API failed:`, catalogResponse.statusText);
    return results;
  }

  const catalogData = await catalogResponse.json();
  if (!catalogData.features || catalogData.features.length === 0) {
    console.log(`[processClusterNdviInline] No Sentinel-2 imagery found for cluster`);
    return results;
  }

  console.log(`[processClusterNdviInline] Found ${catalogData.features.length} scenes`);

  // TIER 2 FIX: Progressive cloud cover thresholds
  const cloudThresholds = [30, 50, 80, 100];
  let l2aScenes: any[] = [];
  let usedThreshold = 0;

  for (const threshold of cloudThresholds) {
    l2aScenes = catalogData.features
      .filter((f: any) => f.id?.includes('MSIL2A') && (f.properties?.['eo:cloud_cover'] || 100) <= threshold)
      .sort((a: any, b: any) => (a.properties?.['eo:cloud_cover'] || 100) - (b.properties?.['eo:cloud_cover'] || 100));
    
    if (l2aScenes.length > 0) {
      usedThreshold = threshold;
      console.log(`[processClusterNdviInline] Found ${l2aScenes.length} L2A scenes with cloud cover <= ${threshold}%`);
      break;
    }
  }

  if (l2aScenes.length === 0) {
    console.log(`[processClusterNdviInline] No L2A scenes found even with 100% cloud cover threshold`);
    return results;
  }

  const scene = l2aScenes[0];
  const acquisitionDate = scene.properties.datetime;
  const cloudCoverage = scene.properties['eo:cloud_cover'] || 0;
  const dataQuality = cloudCoverage > 50 ? 'poor' : cloudCoverage > 30 ? 'fair' : 'good';

  console.log(`[processClusterNdviInline] Using scene from ${acquisitionDate} with ${cloudCoverage}% cloud cover (quality: ${dataQuality})`);


  // Process each land with quality metadata
  for (const landId of cluster.land_ids) {
    const { data: land } = await supabase.from('lands').select('boundary').eq('id', landId).single();
    if (!land?.boundary) continue;

    const landGeometry = typeof land.boundary === 'string' ? JSON.parse(land.boundary) : land.boundary;

    const statisticsPayload = {
      input: {
        bounds: {
          geometry: landGeometry,
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
        },
        data: [{
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: {
              from: new Date(new Date(acquisitionDate).getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              to: new Date(new Date(acquisitionDate).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            maxCloudCoverage: 30
          }
        }]
      },
      aggregation: {
        timeRange: {
          from: new Date(new Date(acquisitionDate).getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date(new Date(acquisitionDate).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        aggregationInterval: { of: 'P1D' },
        evalscript: `
          //VERSION=3
          function setup() {
            return {
              input: [{bands: ["B04", "B08", "SCL"], units: "REFLECTANCE"}],
              output: [{id: "ndvi", bands: 1, sampleType: "FLOAT32"}]
            };
          }
          function evaluatePixel(sample) {
            if (sample.SCL === 3 || sample.SCL === 8 || sample.SCL === 9 || sample.SCL === 10 || sample.SCL === 11) {
              return [NaN];
            }
            let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
            return [ndvi];
          }
        `
      },
      calculations: {
        ndvi: {
          statistics: {
            default: { percentiles: { k: [25, 50, 75] } }
          }
        }
      }
    };

    const statResponse = await fetch(COPERNICUS_STATISTICAL_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(statisticsPayload),
    });

    if (!statResponse.ok) continue;

    const statData = await statResponse.json();
    if (!statData.data || statData.data.length === 0) continue;

    const ndviStats = statData.data[0].outputs.ndvi.bands.B0.stats;
    
    results.push({
      land_id: landId,
      ndvi_mean: ndviStats.mean || 0,
      ndvi_min: ndviStats.min || 0,
      ndvi_max: ndviStats.max || 0,
      ndvi_stddev: ndviStats.stDev || 0,
      acquisition_date: acquisitionDate,
      cloud_coverage: cloudCoverage,
    });

    // Store in database with quality metadata
    await supabase.from('ndvi_micro_tiles').upsert({
      land_id: landId,
      acquisition_date: acquisitionDate,
      ndvi_mean: ndviStats.mean || 0,
      ndvi_min: ndviStats.min || 0,
      ndvi_max: ndviStats.max || 0,
      ndvi_stddev: ndviStats.stDev || 0,
      cloud_coverage: cloudCoverage,
      data_source: 'copernicus_sentinel2',
      processing_method: 'land_cluster_fallback',
      data_quality_score: dataQuality,
      metadata: {
        cloud_cover: cloudCoverage,
        used_cloud_threshold: usedThreshold,
        is_historical: usedThreshold > 50,
        processing_notes: usedThreshold > 50 ? 'Historical data with high cloud cover' : null
      }
    });
  }

  return results;
}

/**
 * Process NDVI for a single tile using Copernicus APIs (base implementation with historical fallback)
 */
async function processTileNdvi(
  token: string,
  tile: TileToProcess,
  startDate: string,
  endDate: string,
  cloudCoverage: number,
  isHistorical: boolean = false
): Promise<NdviProcessResult> {
  const bbox = tile.bbox;
  console.log(`[processTileNdvi] Processing tile ${tile.tile_id}, bbox:`, bbox);

  // Phase 1: Emergency bbox size validation
  const bboxWidth = bbox[2] - bbox[0];
  const bboxHeight = bbox[3] - bbox[1];
  const bboxAreaDegrees = bboxWidth * bboxHeight;
  const bboxAreaKm = bboxWidth * 111.0 * bboxHeight * 111.0;

  console.log(`[processTileNdvi] Bbox validation:`, {
    bbox,
    width_deg: bboxWidth.toFixed(4),
    height_deg: bboxHeight.toFixed(4),
    area_deg2: bboxAreaDegrees.toFixed(4),
    area_km2: bboxAreaKm.toFixed(2)
  });

  // Skip tiles larger than 1° x 1° (~111km x 111km)
  if (bboxAreaDegrees > 1.0) {
    const errorMsg = `Tile bbox too large for Copernicus API (${bboxAreaKm.toFixed(2)} km² exceeds 10,000 km² limit). Use land-first processing instead.`;
    console.warn(`[processTileNdvi] ⚠️ SKIPPING tile ${tile.tile_id}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log(`[processTileNdvi] ✓ Bbox size valid (${bboxAreaKm.toFixed(2)} km²)`);

  // Step 1: Search Catalog API (Copernicus STAC format)
  const catalogPayload = {
    collections: ['SENTINEL-2'],
    bbox: bbox,
    datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
    limit: 20 // Increased to find more options
  };

  console.log(`[processTileNdvi] Catalog request:`, JSON.stringify(catalogPayload));
  
  const catalogResponse = await fetch(COPERNICUS_CATALOG_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(catalogPayload)
  });

  if (!catalogResponse.ok) {
    const errorText = await catalogResponse.text();
    console.error(`[processTileNdvi] Catalog API error:`, {
      status: catalogResponse.status,
      statusText: catalogResponse.statusText,
      body: errorText,
      payload: catalogPayload,
      bbox_area_km2: bboxAreaKm.toFixed(2)
    });
    throw new Error(`Catalog API failed: ${catalogResponse.statusText} - ${errorText} (bbox: ${bboxAreaKm.toFixed(2)} km²)`);
  }

  const catalogData = await catalogResponse.json();
  
  if (!catalogData.features || catalogData.features.length === 0) {
    console.log(`[processTileNdvi] No Sentinel-2 data found in catalog`);
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: endDate || new Date().toISOString().split('T')[0],
      cloudCover: 0
    };
  }

  console.log(`[processTileNdvi] Found ${catalogData.features.length} scenes in catalog`);

  // TIER 2 FIX: Historical data retrieval - get ALL L2A scenes
  const allL2A = catalogData.features.filter((f: any) => f.id?.includes('MSIL2A'));
  
  // Filter for scenes with acceptable cloud cover
  let l2aScenes = allL2A.filter((f: any) => {
    const cloudCover = f.properties?.['eo:cloud_cover'] || 100;
    return cloudCover <= cloudCoverage;
  });

  // TIER 2 FIX: If no scenes found with acceptable cloud cover, use the most recent scene regardless of cloud cover
  if (l2aScenes.length === 0 && allL2A.length > 0) {
    console.log(`[processTileNdvi] No L2A scenes found with cloud cover <= ${cloudCoverage}%. Using most recent scene (HISTORICAL DATA)`);
    
    // Sort by date (most recent first)
    const mostRecent = allL2A.sort((a: any, b: any) => 
      new Date(b.properties.datetime).getTime() - new Date(a.properties.datetime).getTime()
    )[0];
    
    l2aScenes = [mostRecent];
    isHistorical = true;
    
    console.log(`[processTileNdvi] Using historical scene from ${mostRecent.properties.datetime} with ${mostRecent.properties['eo:cloud_cover']}% cloud cover`);
  } else if (l2aScenes.length === 0) {
    console.log(`[processTileNdvi] No L2A scenes found at all`);
    return {
      imageBuffer: null,
      stats: null,
      acquisitionDate: endDate || new Date().toISOString().split('T')[0],
      cloudCover: 0
    };
  }

  // Sort by cloud cover (lowest first)
  const scene = l2aScenes.sort((a: any, b: any) => 
    (a.properties?.['eo:cloud_cover'] || 100) - (b.properties?.['eo:cloud_cover'] || 100)
  )[0];

  const acquisitionDate = scene.properties?.datetime 
    ? new Date(scene.properties.datetime).toISOString().split('T')[0]
    : endDate || new Date().toISOString().split('T')[0];
  const cloudCover = scene.properties?.['eo:cloud_cover'] || 0;
  const dataQuality = isHistorical || cloudCover > 50 ? 'poor' : cloudCover > 30 ? 'fair' : 'good';

  console.log(`[processTileNdvi] Using scene from ${acquisitionDate} with ${cloudCover}% cloud cover (quality: ${dataQuality})`);


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
 * Store NDVI data with quality metadata
 */
async function storeTileNdvi(
  tile: TileToProcess, 
  acquisition_date: string, 
  imageBuffer: Uint8Array, 
  stats: NdviStats, 
  supabase: any,
  cloudCover: number = 0,
  dataQuality: string = 'good',
  isHistorical: boolean = false
): Promise<string> {
  const fileName = `${tile.tile_id}/${acquisition_date}.png`;
  
  await supabase.storage.from("satellite-ndvi-tiles").upload(fileName, imageBuffer, { 
    contentType: "image/png", 
    upsert: true 
  });

  const { data: signed } = await supabase.storage.from("satellite-ndvi-tiles").createSignedUrl(fileName, 60 * 60 * 24 * 7);

  // TIER 2 FIX: Store quality metadata
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
    data_quality_score: dataQuality,
    data_source: 'copernicus_sentinel2',
    metadata: {
      cloud_cover: cloudCover,
      is_historical: isHistorical,
      processing_notes: isHistorical ? 'Historical data used - no recent data with acceptable cloud cover' : null
    }
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

        // Process NDVI with multi-strategy fallback
        const result = await processTileNdviMultiStrategy(token, tile, startDate, endDate, cloudCoverage, supabase);

        if (!result.imageBuffer || !result.stats) {
          console.log(`[process-ndvi-by-tiles] No data available for tile: ${tile.tile_id}`);
          await markTileError(supabase, tile.tile_id, result.acquisitionDate, "No satellite data available");
          errors.push({ tile_id: tile.tile_id, error: "No satellite data available" });
          continue;
        }

        // Store in Supabase Storage with quality metadata
        const dataQuality = result.cloudCover > 50 ? 'poor' : result.cloudCover > 30 ? 'fair' : 'good';
        const isHistorical = result.cloudCover > 50;
        const storageUrl = await storeTileNdvi(
          tile, 
          result.acquisitionDate, 
          result.imageBuffer, 
          result.stats, 
          supabase,
          result.cloudCover,
          dataQuality,
          isHistorical
        );

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
