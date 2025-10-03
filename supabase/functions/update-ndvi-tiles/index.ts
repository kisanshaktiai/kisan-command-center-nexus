import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Copernicus API endpoints
const COPERNICUS_AUTH_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const COPERNICUS_CATALOG_API = 'https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search';
const COPERNICUS_PROCESS_API = 'https://sh.dataspace.copernicus.eu/api/v1/process';
const COPERNICUS_STATISTICAL_API = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';

/**
 * Get OAuth token from Copernicus
 */
async function getOAuthToken(clientId: string, clientSecret: string): Promise<string> {
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
    throw new Error(`Failed to get OAuth token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Search for latest Sentinel-2 L2A scene for a tile
 */
async function searchLatestScene(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string,
  cloudCoverage: number
): Promise<any> {
  const catalogPayload = {
    bbox,
    datetime: `${dateFrom}T00:00:00Z/${dateTo}T23:59:59Z`,
    collections: ['sentinel-2-l2a'],
    limit: 1,
    filter: `eo:cloud_cover < ${cloudCoverage}`
  };

  console.log('[Catalog API] Searching for scenes:', catalogPayload);

  const response = await fetch(COPERNICUS_CATALOG_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(catalogPayload)
  });

  if (!response.ok) {
    throw new Error(`Catalog API failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[Catalog API] Found ${data.features?.length || 0} scenes`);
  
  return data.features?.[0] || null;
}

/**
 * Generate NDVI image for full tile using Process API
 */
async function generateNdviImage(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string
): Promise<Blob> {
  const processEvalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{
          bands: ["B04", "B08"],
          units: "DN"
        }],
        output: {
          bands: 1,
          sampleType: "FLOAT32"
        }
      };
    }
    
    function evaluatePixel(samples) {
      let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
      return [ndvi];
    }
  `;

  const processPayload = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: { timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` } },
        processing: { upsampling: 'BILINEAR', downsampling: 'BICUBIC' }
      }]
    },
    output: {
      width: 512,
      height: 512,
      responses: [{ identifier: 'default', format: { type: 'image/png' } }]
    },
    evalscript: processEvalscript
  };

  const response = await fetch(COPERNICUS_PROCESS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'image/png'
    },
    body: JSON.stringify(processPayload)
  });

  if (!response.ok) {
    throw new Error(`Process API failed: ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * Calculate NDVI statistics for full tile using Statistical API
 */
async function calculateTileStats(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string
): Promise<any> {
  const statsEvalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{
          bands: ["B04", "B08"],
          units: "DN"
        }],
        output: [
          { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
          { id: "dataMask", bands: 1, sampleType: "UINT8" }
        ]
      };
    }
    
    function evaluatePixel(samples) {
      let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
      let dataMask = samples.B08 > 0 && samples.B04 > 0 ? 1 : 0;
      return {
        ndvi: [ndvi],
        dataMask: [dataMask]
      };
    }
  `;

  // Calculate optimal dimensions for ~500m resolution
  const bboxWidth = bbox[2] - bbox[0];
  const bboxHeight = bbox[3] - bbox[1];
  const widthKm = bboxWidth * 111.32;
  const heightKm = bboxHeight * 110.57;
  const width = Math.ceil((widthKm * 1000) / 500);
  const height = Math.ceil((heightKm * 1000) / 500);

  const statsPayload = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: { timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` } }
      }]
    },
    aggregation: {
      timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` },
      aggregationInterval: { of: "P1D" },
      evalscript: statsEvalscript,
      width,
      height
    },
    calculations: {
      default: {
        statistics: {
          default: {
            percentiles: {
              k: [10, 25, 50, 75, 90]
            }
          }
        }
      }
    }
  };

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

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const clientId = Deno.env.get("COPERNICUS_CLIENT_ID");
    const clientSecret = Deno.env.get("COPERNICUS_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error('Copernicus credentials not configured');
    }

    const { 
      tileIds = [],
      forceUpdate = false,
      cloudCoverage = 20
    } = await req.json().catch(() => ({}));

    console.log('[update-ndvi-tiles] Starting tile update:', { tileIds, forceUpdate });

    // Get OAuth token
    const token = await getOAuthToken(clientId, clientSecret);

    // Get tiles to update (either specific tiles or all that need refresh)
    // Join with mgrs_tiles to get geometry
    let query = supabase
      .from('satellite_tiles')
      .select(`
        *,
        mgrs_tile:mgrs_tiles!mgrs_tile_id (
          geometry,
          is_agri,
          state,
          district
        )
      `);

    if (tileIds.length > 0) {
      query = query.in('tile_id', tileIds);
    } else if (!forceUpdate) {
      // Only update tiles older than 24 hours or never updated
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.or(`updated_at.is.null,updated_at.lt.${yesterday}`);
    }

    const { data: tiles, error: tilesError } = await query;

    if (tilesError) throw tilesError;

    console.log(`[update-ndvi-tiles] Found ${tiles?.length || 0} tiles to update`);

    const results = {
      processed: 0,
      updated: 0,
      errors: [] as any[]
    };

    const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = new Date().toISOString().split('T')[0];

    for (const tile of tiles || []) {
      try {
        console.log(`[update-ndvi-tiles] Processing tile: ${tile.tile_id}`);
        
        // Skip if no mgrs_tile geometry data
        if (!tile.mgrs_tile || !tile.mgrs_tile.geometry) {
          console.warn(`[update-ndvi-tiles] Skipping ${tile.tile_id}: No geometry data`);
          results.processed++;
          continue;
        }
        
        // Extract bbox from geometry
        const geom = tile.mgrs_tile.geometry;
        let bbox: number[];
        
        if (geom.type === 'MultiPolygon') {
          const coords = geom.coordinates[0][0];
          const lngs = coords.map((c: number[]) => c[0]);
          const lats = coords.map((c: number[]) => c[1]);
          bbox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
        } else if (geom.type === 'Polygon') {
          const coords = geom.coordinates[0];
          const lngs = coords.map((c: number[]) => c[0]);
          const lats = coords.map((c: number[]) => c[1]);
          bbox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
        } else {
          throw new Error(`Unsupported geometry type: ${geom.type}`);
        }

        // Search for latest scene
        const scene = await searchLatestScene(token, bbox, dateFrom, dateTo, cloudCoverage);
        
        if (!scene) {
          console.log(`[update-ndvi-tiles] No data found for ${tile.tile_id}`);
          results.processed++;
          continue;
        }

        // Calculate statistics
        const stats = await calculateTileStats(token, bbox, dateFrom, dateTo);
        
        const ndviStats = stats.data?.[0]?.outputs?.default?.bands?.ndvi?.stats;
        const acquisitionDate = scene.properties.datetime.split('T')[0];
        const cloudCover = scene.properties['eo:cloud_cover'];

        // Generate NDVI image
        const imageBlob = await generateNdviImage(token, bbox, dateFrom, dateTo);
        const imageBuffer = await imageBlob.arrayBuffer();
        
        // Upload to Supabase Storage
        const storagePath = `ndvi-tiles/${tile.tile_id}/${acquisitionDate}.png`;
        const { error: uploadError } = await supabase.storage
          .from('ndvi-tiles')
          .upload(storagePath, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error(`[update-ndvi-tiles] Upload error for ${tile.tile_id}:`, uploadError);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('ndvi-tiles')
          .getPublicUrl(storagePath);

        // Update satellite_tiles table
        const { error: updateError } = await supabase
          .from('satellite_tiles')
          .update({
            status: 'ready',
            acquisition_date: acquisitionDate,
            cloud_cover: cloudCover,
            ndvi_mean: ndviStats?.mean || null,
            ndvi_min: ndviStats?.min || null,
            ndvi_max: ndviStats?.max || null,
            ndvi_std_dev: ndviStats?.stDev || null,
            ndvi_image_url: publicUrl,
            updated_at: new Date().toISOString(),
            last_error: null
          })
          .eq('id', tile.id);

        if (updateError) throw updateError;

        results.processed++;
        results.updated++;
        console.log(`[update-ndvi-tiles] ✓ Updated ${tile.tile_id}`);

      } catch (error) {
        console.error(`[update-ndvi-tiles] Error processing ${tile.tile_id}:`, error);
        results.processed++;
        results.errors.push({
          tile: tile.tile_id,
          error: error.message
        });

        // Update tile status to error
        await supabase
          .from('satellite_tiles')
          .update({
            status: 'error',
            last_error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', tile.id);
      }
    }

    console.log('[update-ndvi-tiles] Complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        data: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[update-ndvi-tiles] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
