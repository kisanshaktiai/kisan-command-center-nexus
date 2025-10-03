import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

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

    // Get OAuth token
    const accessToken = await getOAuthToken();
    if (!accessToken) {
      throw new Error('Failed to obtain OAuth token');
    }
    console.log('[process-ndvi-by-tiles] ✓ OAuth token obtained');

    // Get tiles to process
    const tilesToProcess = await getTilesToProcess(supabase, tileIds, forceUpdate);
    console.log(`[process-ndvi-by-tiles] Found ${tilesToProcess.length} tiles to process`);

    const processedTiles: ProcessedTile[] = [];
    const errors: any[] = [];
    let skippedCount = 0;

    // Process each tile
    for (const tile of tilesToProcess) {
      try {
        console.log(`\n[process-ndvi-by-tiles] Processing tile: ${tile.tile_id}`);

        // Check if tile was recently processed (24h cache)
        if (!forceUpdate && await isTileFresh(supabase, tile.tile_id)) {
          console.log(`[process-ndvi-by-tiles] Skipping fresh tile: ${tile.tile_id}`);
          skippedCount++;
          continue;
        }

        // Process tile NDVI
        const result = await processTileNdvi(
          tile,
          startDate,
          endDate,
          cloudCoverage,
          accessToken
        );

        if (!result) {
          console.log(`[process-ndvi-by-tiles] No data available for tile: ${tile.tile_id}`);
          errors.push({ tile_id: tile.tile_id, error: 'No satellite data available' });
          continue;
        }

        // Store tile NDVI
        const storageUrl = await storeTileNdvi(tile, result, supabase);

        // Map lands to tile
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

        console.log(`[process-ndvi-by-tiles] ✓ Successfully processed tile ${tile.tile_id}, affected ${affectedLands} lands`);
      } catch (error) {
        console.error(`[process-ndvi-by-tiles] Error processing tile ${tile.tile_id}:`, error);
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
      message: `Successfully processed ${processedTiles.filter(t => t.status === 'success').length} of ${tilesToProcess.length} tiles`,
    };

    console.log('[process-ndvi-by-tiles] Complete:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[process-ndvi-by-tiles] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getOAuthToken(): Promise<string | null> {
  const clientId = Deno.env.get('COPERNICUS_CLIENT_ID');
  const clientSecret = Deno.env.get('COPERNICUS_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('[OAuth] Missing credentials');
    return null;
  }

  try {
    const response = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      console.error('[OAuth] Failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('[OAuth] Error:', error);
    return null;
  }
}

async function getTilesToProcess(
  supabase: any,
  tileIds: string[],
  forceUpdate: boolean
): Promise<TileToProcess[]> {
  // First, get all tiles with lands
  const { data: tilesWithLands, error: landsError } = await supabase.rpc('get_tiles_with_lands');
  
  if (landsError) {
    console.error('[getTilesToProcess] Error fetching tiles with lands:', landsError);
    throw new Error(`Failed to fetch tiles with lands: ${landsError.message}`);
  }

  const tilesWithLandIds = (tilesWithLands || []).map((t: any) => t.tile_id);
  console.log(`[getTilesToProcess] Found ${tilesWithLandIds.length} tiles with lands:`, tilesWithLandIds);

  if (tilesWithLandIds.length === 0) {
    console.log('[getTilesToProcess] No tiles have lands - nothing to process');
    return [];
  }

  // Now fetch full tile data for tiles that have lands
  let query = supabase
    .from('mgrs_tiles')
    .select('tile_id, id, geometry')
    .eq('is_agri', true)
    .in('tile_id', tilesWithLandIds);

  // If specific tileIds requested, filter further
  if (tileIds.length > 0) {
    query = query.in('tile_id', tileIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getTilesToProcess] Error:', error);
    throw new Error(`Failed to fetch tiles: ${error.message}`);
  }

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

  if (error) {
    console.error('[isTileFresh] Error:', error);
    return false;
  }

  return !!data;
}

function extractBboxFromGeometry(geometry: any): number[] {
  if (!geometry || !geometry.coordinates) {
    throw new Error('Invalid geometry');
  }

  let coords: number[][];
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    coords = geometry.coordinates[0][0];
  } else {
    throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }

  const lons = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);

  return [
    Math.min(...lons), // west
    Math.min(...lats), // south
    Math.max(...lons), // east
    Math.max(...lats), // north
  ];
}

async function processTileNdvi(
  tile: TileToProcess,
  startDate: string,
  endDate: string,
  cloudCoverage: number,
  accessToken: string
): Promise<TileProcessingResult | null> {
  console.log(`[processTileNdvi] Processing tile ${tile.tile_id}, bbox:`, tile.bbox);

  // 1. Catalog API - Search for scenes (bbox + datetime only)
  // Note: Cloud filtering is NOT supported in STAC Catalog API
  // Cloud cover filtering is handled by Statistical API's maxCloudCoverage parameter
  const catalogPayload = {
    collections: ['SENTINEL-2'],
    bbox: tile.bbox,
    datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
    limit: 10
  };

  console.log('[Catalog API] Searching for scenes:', JSON.stringify(catalogPayload, null, 2));

  const catalogResponse = await fetch('https://catalogue.dataspace.copernicus.eu/stac/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(catalogPayload),
  });

  if (!catalogResponse.ok) {
    const errorText = await catalogResponse.text();
    console.error('[Catalog API] Failed with status', catalogResponse.status, ':', errorText);
    return null;
  }

  const catalogData = await catalogResponse.json();
  console.log(`[Catalog API] Found ${catalogData.features?.length || 0} scenes`);

  if (!catalogData.features || catalogData.features.length === 0) {
    return null;
  }

  const scene = catalogData.features[0];
  const acquisitionDate = scene.properties.datetime.split('T')[0];
  const cloudCover = scene.properties['eo:cloud_cover'] || 0;

  console.log(`[processTileNdvi] Selected scene: ${scene.id}, date: ${acquisitionDate}, cloud: ${cloudCover}%`);

  // 2. Statistical API - Get NDVI stats
  const statsPayload = {
    input: {
      bounds: {
        bbox: tile.bbox,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [
        {
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: {
              from: `${acquisitionDate}T00:00:00Z`,
              to: `${acquisitionDate}T23:59:59Z`,
            },
            maxCloudCoverage: cloudCoverage,
          },
        },
      ],
    },
    aggregation: {
      timeRange: {
        from: `${acquisitionDate}T00:00:00Z`,
        to: `${acquisitionDate}T23:59:59Z`,
      },
      aggregationInterval: {
        of: 'P1D',
      },
      width: 512,
      height: 512,
      evalscript: `
        //VERSION=3
        function setup() {
          return {
            input: [{
              bands: ["B04", "B08", "SCL"],
              units: "DN"
            }],
            output: [
              { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
              { id: "dataMask", bands: 1 }
            ]
          };
        }
        function evaluatePixel(samples) {
          let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
          let validNDVI = 1;
          if (samples.B04 + samples.B08 == 0 || samples.SCL == 3 || samples.SCL == 8 || samples.SCL == 9 || samples.SCL == 10) {
            ndvi = -999;
            validNDVI = 0;
          }
          return {
            ndvi: [ndvi],
            dataMask: [validNDVI]
          };
        }
      `,
      calculations: {
        ndvi: {
          statistics: {
            default: {
              percentiles: {
                k: [10, 25, 50, 75, 90],
              },
            },
          },
        },
      },
    },
  };

  const statsResponse = await fetch('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(statsPayload),
  });

  if (!statsResponse.ok) {
    console.error('[Statistical API] Failed:', await statsResponse.text());
    throw new Error('Failed to get NDVI statistics');
  }

  const statsData = await statsResponse.json();
  const ndviStats = statsData.data[0]?.outputs?.ndvi?.bands?.B0?.stats || {};

  const stats: NdviStats = {
    mean: ndviStats.mean || 0,
    min: ndviStats.min || 0,
    max: ndviStats.max || 0,
    std: ndviStats.stDev || 0,
    percentiles: ndviStats.percentiles || {},
  };

  console.log('[Statistical API] NDVI stats:', stats);

  // 3. Process API - Generate PNG
  const processPayload = {
    input: {
      bounds: {
        bbox: tile.bbox,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [
        {
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: {
              from: `${acquisitionDate}T00:00:00Z`,
              to: `${acquisitionDate}T23:59:59Z`,
            },
            maxCloudCoverage: cloudCoverage,
          },
        },
      ],
    },
    output: {
      width: 512,
      height: 512,
      responses: [
        {
          identifier: 'default',
          format: { type: 'image/png' },
        },
      ],
    },
    evalscript: `
      //VERSION=3
      function setup() {
        return {
          input: ["B04", "B08", "SCL"],
          output: { bands: 3, sampleType: "AUTO" }
        };
      }
      function evaluatePixel(sample) {
        let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
        if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 10) {
          return [0, 0, 0];
        }
        if (ndvi < -0.1) return [0.5, 0.5, 1.0];
        if (ndvi < 0.1) return [0.8, 0.7, 0.6];
        if (ndvi < 0.3) return [1.0, 0.9, 0.4];
        if (ndvi < 0.5) return [0.8, 0.9, 0.3];
        if (ndvi < 0.7) return [0.3, 0.8, 0.3];
        return [0.0, 0.5, 0.0];
      }
    `,
  };

  const processResponse = await fetch('https://sh.dataspace.copernicus.eu/api/v1/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'image/png',
    },
    body: JSON.stringify(processPayload),
  });

  if (!processResponse.ok) {
    console.error('[Process API] Failed:', await processResponse.text());
    throw new Error('Failed to generate NDVI image');
  }

  const imageBlob = await processResponse.blob();
  console.log(`[Process API] Generated PNG (${imageBlob.size} bytes)`);

  return {
    scene,
    stats,
    imageBlob,
    bbox: tile.bbox,
    acquisition_date: acquisitionDate,
    cloud_cover: cloudCover,
  };
}

async function storeTileNdvi(
  tile: TileToProcess,
  result: TileProcessingResult,
  supabase: any
): Promise<string> {
  // Upload PNG to storage
  const fileName = `${tile.tile_id}/${result.acquisition_date}.png`;
  const arrayBuffer = await result.imageBlob.arrayBuffer();

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('satellite-ndvi-tiles')
    .upload(fileName, arrayBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    console.error('[Storage] Upload failed:', uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('satellite-ndvi-tiles')
    .getPublicUrl(fileName);

  const storageUrl = urlData.publicUrl;
  console.log(`[Storage] Uploaded to: ${storageUrl}`);

  // Upsert satellite_tiles record with numeric stats
  const { error: upsertError } = await supabase
    .from('satellite_tiles')
    .upsert({
      tile_id: tile.tile_id,
      acquisition_date: result.acquisition_date,
      cloud_cover: result.cloud_cover,
      ndvi_path: storageUrl,
      ndvi_mean: result.stats.mean,
      ndvi_min: result.stats.min,
      ndvi_max: result.stats.max,
      ndvi_std_dev: result.stats.std,
      ndvi_stats: result.stats,
      bbox: result.bbox,
      status: 'ready',
      collection: 'SENTINEL-2',
      last_checked: new Date().toISOString(),
      metadata: {
        scene_id: result.scene.id,
        processing_date: new Date().toISOString(),
      },
    }, {
      onConflict: 'tile_id,acquisition_date',
    });

  if (upsertError) {
    console.error('[DB] Upsert failed:', upsertError);
    throw new Error(`Database upsert failed: ${upsertError.message}`);
  }

  console.log(`[storeTileNdvi] ✓ Stored tile data for ${tile.tile_id}`);
  return storageUrl;
}

async function mapLandsToTile(
  tileId: string,
  acquisitionDate: string,
  stats: NdviStats,
  ndviUrl: string,
  cloudCover: number,
  bbox: number[],
  supabase: any
): Promise<number> {
  // Get lands intersecting this tile using the helper function
  const { data: lands, error: landsError } = await supabase.rpc('get_lands_by_tile', {
    p_tile_id: tileId,
  });

  if (landsError) {
    console.error(`[mapLandsToTile] Error fetching lands:`, landsError);
    return 0;
  }

  if (!lands || lands.length === 0) {
    console.log(`[mapLandsToTile] No lands found for tile ${tileId}`);
    return 0;
  }

  console.log(`[mapLandsToTile] Found ${lands.length} lands for tile ${tileId}`);

  // Insert/update ndvi_micro_tiles for each land
  const records = lands.map((land: any) => ({
    land_id: land.land_id,
    farmer_id: land.farmer_id,
    tenant_id: land.tenant_id,
    bbox: bbox,
    acquisition_date: acquisitionDate,
    cloud_cover: cloudCover,
    ndvi_mean: stats.mean,
    ndvi_min: stats.min,
    ndvi_max: stats.max,
    ndvi_std_dev: stats.std,
    ndvi_thumbnail_url: ndviUrl,
    statistics_only: false,
  }));

  const { error: insertError } = await supabase
    .from('ndvi_micro_tiles')
    .upsert(records, {
      onConflict: 'land_id,acquisition_date',
    });

  if (insertError) {
    console.error('[mapLandsToTile] Insert error:', insertError);
    throw new Error(`Failed to insert NDVI records: ${insertError.message}`);
  }

  console.log(`[mapLandsToTile] ✓ Updated ${lands.length} land records`);
  return lands.length;
}
