// Land-First NDVI Processing Edge Function
// Processes NDVI data for farmer lands in optimized clusters

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const COPERNICUS_CLIENT_ID = Deno.env.get('COPERNICUS_CLIENT_ID');
const COPERNICUS_CLIENT_SECRET = Deno.env.get('COPERNICUS_CLIENT_SECRET');
const COPERNICUS_CATALOG_API = 'https://catalogue.dataspace.copernicus.eu/stac/search';
const COPERNICUS_STATISTICAL_API = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';
const COPERNICUS_PROCESS_API = 'https://sh.dataspace.copernicus.eu/api/v1/process';

// Validate credentials at startup
if (!COPERNICUS_CLIENT_ID || !COPERNICUS_CLIENT_SECRET) {
  console.error('[process-ndvi-by-lands] CRITICAL: Missing Copernicus credentials');
  console.error('[process-ndvi-by-lands] CLIENT_ID:', COPERNICUS_CLIENT_ID ? 'SET' : 'MISSING');
  console.error('[process-ndvi-by-lands] CLIENT_SECRET:', COPERNICUS_CLIENT_SECRET ? 'SET' : 'MISSING');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClusterData {
  cluster_id: number;
  land_ids: string[];
  cluster_bbox: number[];
  bbox_area_km2: number;
  land_count: number;
}

interface LandNdviResult {
  land_id: string;
  ndvi_mean: number;
  ndvi_min: number;
  ndvi_max: number;
  ndvi_stddev: number;
  acquisition_date: string;
  cloud_coverage: number;
  image_url?: string;
}

// Get Copernicus OAuth token
async function getCopernicusToken(): Promise<string> {
  if (!COPERNICUS_CLIENT_ID || !COPERNICUS_CLIENT_SECRET) {
    throw new Error('Copernicus credentials not configured. Please set COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET in Supabase secrets.');
  }

  console.log('[getCopernicusToken] Requesting OAuth token...');
  console.log('[getCopernicusToken] Client ID:', COPERNICUS_CLIENT_ID ? `${COPERNICUS_CLIENT_ID.substring(0, 8)}...` : 'MISSING');
  
  const response = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: COPERNICUS_CLIENT_ID,
      client_secret: COPERNICUS_CLIENT_SECRET,
    }),
  });

  console.log('[getCopernicusToken] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[getCopernicusToken] Error:', errorText);
    throw new Error(`Failed to get Copernicus token (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  console.log('[getCopernicusToken] ✓ Token obtained successfully');
  return data.access_token;
}

// Track API call for cost monitoring
async function trackApiCall(
  supabase: any,
  params: {
    tenantId: string;
    clusterId?: string;
    landId?: string;
    apiType: 'catalog' | 'statistical' | 'process';
    bbox: number[];
    pixels?: number;
    dataSizeMb?: number;
    responseTimeMs: number;
    success: boolean;
    error?: string;
    requestPayload?: any;
    responseMetadata?: any;
  }
) {
  const bboxAreaKm2 = (params.bbox[2] - params.bbox[0]) * 111.0 * (params.bbox[3] - params.bbox[1]) * 111.0;
  const processingUnits = params.pixels ? (params.pixels / 1000000) * 0.01 : bboxAreaKm2 * 0.1;
  const costEstimate = processingUnits * 0.0001;

  await supabase.from('copernicus_api_calls').insert({
    tenant_id: params.tenantId,
    cluster_id: params.clusterId,
    land_id: params.landId,
    api_type: params.apiType,
    bbox_requested: params.bbox,
    bbox_area_km2: bboxAreaKm2,
    pixels_requested: params.pixels,
    data_size_mb: params.dataSizeMb,
    processing_units: processingUnits,
    cost_estimate: costEstimate,
    response_time_ms: params.responseTimeMs,
    success: params.success,
    error_message: params.error,
    request_payload: params.requestPayload,
    response_metadata: params.responseMetadata,
  });
}

// Process NDVI for a land cluster
async function processClusterNdvi(
  supabase: any,
  cluster: ClusterData,
  tenantId: string,
  token: string
): Promise<LandNdviResult[]> {
  const startTime = Date.now();
  const results: LandNdviResult[] = [];

  console.log(`[processClusterNdvi] Processing cluster ${cluster.cluster_id} with ${cluster.land_count} lands`);
  console.log(`[processClusterNdvi] Cluster bbox:`, cluster.cluster_bbox, `Area: ${cluster.bbox_area_km2} km²`);

  // Step 1: Search for Sentinel-2 imagery
  const catalogStartTime = Date.now();
  const catalogPayload = {
    collections: ['SENTINEL-2'],
    bbox: cluster.cluster_bbox,
    datetime: `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}/${new Date().toISOString().split('T')[0]}`,
    limit: 1,
    query: { 'eo:cloud_cover': { lte: 20 } }
  };

  const catalogResponse = await fetch(COPERNICUS_CATALOG_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(catalogPayload),
  });

  const catalogTime = Date.now() - catalogStartTime;

  if (!catalogResponse.ok) {
    const errorText = await catalogResponse.text();
    await trackApiCall(supabase, {
      tenantId,
      clusterId: String(cluster.cluster_id),
      apiType: 'catalog',
      bbox: cluster.cluster_bbox,
      responseTimeMs: catalogTime,
      success: false,
      error: `Catalog API failed: ${catalogResponse.statusText} - ${errorText}`,
      requestPayload: catalogPayload,
    });
    throw new Error(`Catalog API failed for cluster ${cluster.cluster_id}`);
  }

  const catalogData = await catalogResponse.json();
  await trackApiCall(supabase, {
    tenantId,
    clusterId: String(cluster.cluster_id),
    apiType: 'catalog',
    bbox: cluster.cluster_bbox,
    responseTimeMs: catalogTime,
    success: true,
    responseMetadata: { features_found: catalogData.features?.length || 0 },
  });

  if (!catalogData.features || catalogData.features.length === 0) {
    console.log(`[processClusterNdvi] No imagery found for cluster ${cluster.cluster_id}`);
    return results;
  }

  const feature = catalogData.features[0];
  const acquisitionDate = feature.properties.datetime;
  const cloudCoverage = feature.properties['eo:cloud_cover'] || 0;

  console.log(`[processClusterNdvi] Found imagery: ${acquisitionDate}, cloud coverage: ${cloudCoverage}%`);

  // Step 2: Calculate NDVI for each land in the cluster
  for (const landId of cluster.land_ids) {
    // Get land geometry
    const { data: land } = await supabase
      .from('lands')
      .select('boundary, area_acres')
      .eq('id', landId)
      .single();

    if (!land || !land.boundary) continue;

    // Calculate NDVI statistics for this specific land
    const statStartTime = Date.now();
    const landGeometry = typeof land.boundary === 'string' 
      ? JSON.parse(land.boundary) 
      : land.boundary;

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
            default: {
              percentiles: { k: [25, 50, 75] }
            }
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

    const statTime = Date.now() - statStartTime;

    if (!statResponse.ok) {
      const errorText = await statResponse.text();
      await trackApiCall(supabase, {
        tenantId,
        landId,
        apiType: 'statistical',
        bbox: cluster.cluster_bbox,
        responseTimeMs: statTime,
        success: false,
        error: `Statistical API failed: ${statResponse.statusText} - ${errorText}`,
      });
      console.error(`[processClusterNdvi] Statistical API failed for land ${landId}`);
      continue;
    }

    const statData = await statResponse.json();
    await trackApiCall(supabase, {
      tenantId,
      landId,
      apiType: 'statistical',
      bbox: cluster.cluster_bbox,
      responseTimeMs: statTime,
      success: true,
      responseMetadata: { intervals: statData.data?.length || 0 },
    });

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

    console.log(`[processClusterNdvi] Land ${landId} NDVI: ${ndviStats.mean?.toFixed(3)}`);
  }

  console.log(`[processClusterNdvi] Processed cluster ${cluster.cluster_id} in ${Date.now() - startTime}ms`);
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { tenantId, landIds, urgent = false } = await req.json();

    if (!tenantId) {
      return new Response(JSON.stringify({ success: false, error: 'Tenant ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-ndvi-by-lands] Starting for tenant ${tenantId}, landIds:`, landIds || 'all');

    // Get Copernicus OAuth token
    const token = await getCopernicusToken();
    console.log(`[process-ndvi-by-lands] ✓ OAuth token obtained`);

    // Get land clusters
    const { data: clusters, error: clusterError } = await supabase
      .rpc('cluster_lands_for_ndvi', {
        p_tenant_id: tenantId,
        p_max_distance_km: 1.0,
        p_max_cluster_area_km2: 25.0
      });

    if (clusterError) throw clusterError;

    console.log(`[process-ndvi-by-lands] Found ${clusters?.length || 0} clusters`);

    const allResults: LandNdviResult[] = [];
    const errors: Array<{ cluster_id: number; error: string }> = [];

    // Process each cluster
    for (const cluster of clusters || []) {
      // Filter by landIds if provided
      if (landIds && landIds.length > 0) {
        cluster.land_ids = cluster.land_ids.filter((id: string) => landIds.includes(id));
        if (cluster.land_ids.length === 0) continue;
      }

      try {
        const results = await processClusterNdvi(supabase, cluster, tenantId, token);
        allResults.push(...results);

        // Store results in ndvi_micro_tiles
        for (const result of results) {
          await supabase.from('ndvi_micro_tiles').upsert({
            land_id: result.land_id,
            acquisition_date: result.acquisition_date,
            ndvi_mean: result.ndvi_mean,
            ndvi_min: result.ndvi_min,
            ndvi_max: result.ndvi_max,
            ndvi_stddev: result.ndvi_stddev,
            cloud_coverage: result.cloud_coverage,
            data_source: 'copernicus_sentinel2',
            processing_method: 'land_cluster',
          });
        }
      } catch (error) {
        console.error(`[process-ndvi-by-lands] Error processing cluster ${cluster.cluster_id}:`, error);
        errors.push({
          cluster_id: cluster.cluster_id,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          total_clusters: clusters?.length || 0,
          processed_lands: allResults.length,
          results: allResults,
          errors,
        },
        message: `Successfully processed ${allResults.length} lands`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-ndvi-by-lands] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
