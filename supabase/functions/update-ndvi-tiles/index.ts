import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { handleError } from '../_shared/errorHandler.ts';

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
 * Extract bbox from PostGIS geography/geometry
 */
function extractBbox(geom: any): number[] {
  console.log('[extractBbox] Extracting bbox from geometry:', JSON.stringify(geom).substring(0, 200));
  
  let coords: number[][];
  
  if (geom.type === 'Polygon') {
    coords = geom.coordinates[0];
  } else if (geom.type === 'MultiPolygon') {
    coords = geom.coordinates[0][0];
  } else {
    throw new Error(`Unsupported geometry type: ${geom.type}`);
  }
  
  const lngs = coords.map((c: number[]) => c[0]);
  const lats = coords.map((c: number[]) => c[1]);
  const bbox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  
  console.log('[extractBbox] Extracted bbox:', bbox);
  return bbox;
}

/**
 * Search for latest Sentinel-2 L2A scene using Catalog API
 */
async function searchLatestScene(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string,
  cloudCoverageThreshold: number = 20
): Promise<any> {
  const catalogPayload = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime: `${dateFrom}T00:00:00Z/${dateTo}T23:59:59Z`,
    limit: 1,
    filter: `eo:cloud_cover < ${cloudCoverageThreshold}`,
    'filter-lang': 'cql2-text'
  };

  console.log('[Catalog API] Payload:', JSON.stringify(catalogPayload, null, 2));

  const response = await fetch(COPERNICUS_CATALOG_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(catalogPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Catalog API] Error response:', errorText);
    throw new Error(`Catalog API failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log(`[Catalog API] Response: Found ${data.features?.length || 0} scenes`);
  
  if (data.features && data.features.length > 0) {
    console.log('[Catalog API] Latest scene:', {
      id: data.features[0].id,
      datetime: data.features[0].properties.datetime,
      cloudCover: data.features[0].properties['eo:cloud_cover']
    });
  }
  
  return data.features?.[0] || null;
}

/**
 * Generate NDVI PNG using Process API
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
          bands: ["B04", "B08", "dataMask"],
          units: "DN"
        }],
        output: {
          bands: 3,
          sampleType: "AUTO"
        }
      };
    }
    
    function evaluatePixel(samples) {
      if (samples.dataMask == 0) return [0, 0, 0];
      
      let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
      
      // Color mapping for NDVI visualization
      if (ndvi < 0) return [0.5, 0.5, 0.5]; // Gray for water/non-vegetation
      if (ndvi < 0.2) return [0.8, 0.7, 0.6]; // Light brown for bare soil
      if (ndvi < 0.4) return [1, 1, 0.5]; // Yellow for sparse vegetation
      if (ndvi < 0.6) return [0.7, 1, 0.3]; // Light green for moderate vegetation
      if (ndvi < 0.8) return [0.2, 0.8, 0.2]; // Green for dense vegetation
      return [0, 0.5, 0]; // Dark green for very dense vegetation
    }
  `;

  const processPayload = {
    input: {
      bounds: { 
        bbox, 
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } 
      },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: { 
          timeRange: { 
            from: `${dateFrom}T00:00:00Z`, 
            to: `${dateTo}T23:59:59Z` 
          } 
        }
      }]
    },
    output: {
      width: 512,
      height: 512,
      responses: [{ 
        identifier: 'default', 
        format: { type: 'image/png' } 
      }]
    },
    evalscript: processEvalscript
  };

  console.log('[Process API] Payload:', JSON.stringify(processPayload, null, 2));

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
    const errorText = await response.text();
    console.error('[Process API] Error response:', errorText);
    throw new Error(`Process API failed (${response.status}): ${errorText}`);
  }

  console.log('[Process API] Successfully generated NDVI PNG');
  return await response.blob();
}

/**
 * Calculate NDVI statistics using Statistical API
 */
async function calculateNdviStats(
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
          bands: ["B04", "B08", "dataMask"],
          units: "DN"
        }],
        output: [
          { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
          { id: "dataMask", bands: 1, sampleType: "UINT8" }
        ]
      };
    }
    
    function evaluatePixel(samples) {
      if (samples.dataMask == 0) {
        return {
          ndvi: [null],
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

  const statsPayload = {
    input: {
      bounds: { 
        bbox, 
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } 
      },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: { 
          timeRange: { 
            from: `${dateFrom}T00:00:00Z`, 
            to: `${dateTo}T23:59:59Z` 
          } 
        }
      }]
    },
    aggregation: {
      timeRange: { 
        from: `${dateFrom}T00:00:00Z`, 
        to: `${dateTo}T23:59:59Z` 
      },
      aggregationInterval: { of: 'P1D' },
      evalscript: statsEvalscript,
      width: 512,
      height: 512
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

  console.log('[Statistical API] Payload:', JSON.stringify(statsPayload, null, 2));

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
    console.error('[Statistical API] Error response:', errorText);
    throw new Error(`Statistical API failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('[Statistical API] Response:', JSON.stringify(data, null, 2));
  
  return data;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const clientId = Deno.env.get('COPERNICUS_CLIENT_ID');
    const clientSecret = Deno.env.get('COPERNICUS_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('Copernicus credentials not configured');
    }

    // Parse request body for user-provided parameters
    const body = await req.json().catch(() => ({}));
    const {
      startDate: userStartDate,
      endDate: userEndDate,
      cloudCoverage: userCloudCoverage,
      regions: userRegions,
      tileIds,
      forceUpdate
    } = body;

    console.log('[update-ndvi-tiles] Starting NDVI data sync with params:', {
      startDate: userStartDate,
      endDate: userEndDate,
      cloudCoverage: userCloudCoverage,
      regions: userRegions,
      tileIds,
      forceUpdate
    });

    // Get OAuth token
    const token = await getOAuthToken(clientId, clientSecret);
    console.log('[update-ndvi-tiles] ✓ OAuth token obtained');

    // Get all active lands with boundaries - use RPC to get GeoJSON format
    const { data: lands, error: landsError } = await supabase
      .rpc('get_lands_with_geojson_boundary');

    if (landsError) {
      console.error('[update-ndvi-tiles] Error fetching lands:', landsError);
      throw landsError;
    }

    console.log(`[update-ndvi-tiles] Found ${lands?.length || 0} lands to process`);

    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [] as any[]
    };

    // Date range: use user-provided dates or default to last 30 days
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date;
    
    if (userStartDate && userEndDate) {
      // Use user-provided dates
      dateFrom = new Date(userStartDate);
      dateTo = new Date(userEndDate);
      console.log('[update-ndvi-tiles] Using user-provided date range');
    } else {
      // Default: last 30 days, excluding today (satellite data is historical)
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateTo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      console.log('[update-ndvi-tiles] Using default date range (last 30 days)');
    }
    
    // Ensure dates are in the past
    if (dateTo > now) {
      dateTo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    }
    
    const dateFromStr = dateFrom.toISOString().split('T')[0];
    const dateToStr = dateTo.toISOString().split('T')[0];
    
    // Cloud coverage: use user-provided value or default to 20%
    const cloudCoverageThreshold = userCloudCoverage ?? 20;

    console.log(`[update-ndvi-tiles] Searching for imagery from ${dateFromStr} to ${dateToStr} with cloud coverage <= ${cloudCoverageThreshold}%`);

    for (const land of lands || []) {
      try {
        console.log(`\n[update-ndvi-tiles] Processing land: ${land.name} (${land.id})`);
        
        // Check if we have recent data (within 24 hours) unless forceUpdate is true
        if (!forceUpdate) {
          const { data: existingData } = await supabase
            .from('ndvi_micro_tiles')
            .select('acquisition_date, created_at')
            .eq('land_id', land.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (existingData) {
            const lastUpdate = new Date(existingData.created_at);
            const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceUpdate < 24) {
              console.log(`[update-ndvi-tiles] Skipping ${land.name}: Data is recent (${hoursSinceUpdate.toFixed(1)}h old)`);
              results.processed++;
              results.skipped++;
              continue;
            }
          }
        } else {
          console.log(`[update-ndvi-tiles] Force update enabled for ${land.name}`);
        }

        // Extract bbox from land boundary
        const bbox = extractBbox(land.boundary);
        console.log(`[update-ndvi-tiles] Bbox for ${land.name}:`, bbox);

        // Search for latest scene with user-specified cloud coverage threshold
        const scene = await searchLatestScene(token, bbox, dateFromStr, dateToStr, cloudCoverageThreshold);
        
        if (!scene) {
          console.log(`[update-ndvi-tiles] No satellite data found for ${land.name}`);
          results.processed++;
          results.errors.push({
            land: land.name,
            error: 'No satellite data available'
          });
          continue;
        }

        const acquisitionDate = scene.properties.datetime.split('T')[0];
        const cloudCover = scene.properties['eo:cloud_cover'];
        
        console.log(`[update-ndvi-tiles] Scene found - Date: ${acquisitionDate}, Cloud: ${cloudCover}%`);

        // Calculate NDVI statistics
        const statsData = await calculateNdviStats(token, bbox, dateFromStr, dateToStr);
        
        const ndviStats = statsData.data?.[0]?.outputs?.default?.bands?.ndvi?.stats;
        
        if (!ndviStats) {
          throw new Error('No NDVI statistics in response');
        }

        console.log('[update-ndvi-tiles] NDVI Stats:', {
          mean: ndviStats.mean,
          min: ndviStats.min,
          max: ndviStats.max,
          stDev: ndviStats.stDev
        });

        // Generate NDVI PNG
        const imageBlob = await generateNdviImage(token, bbox, dateFromStr, dateToStr);
        const imageBuffer = await imageBlob.arrayBuffer();
        
        // Upload to Supabase Storage
        const storagePath = `${land.tenant_id}/${land.id}/${acquisitionDate}.png`;
        const { error: uploadError } = await supabase.storage
          .from('ndvi-tiles')
          .upload(storagePath, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error(`[update-ndvi-tiles] Upload error:`, uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('ndvi-tiles')
          .getPublicUrl(storagePath);

        console.log('[update-ndvi-tiles] ✓ NDVI PNG uploaded:', publicUrl);

        // Store in ndvi_micro_tiles
        const { error: insertError } = await supabase
          .from('ndvi_micro_tiles')
          .upsert({
            land_id: land.id,
            tenant_id: land.tenant_id,
            acquisition_date: acquisitionDate,
            ndvi_mean: ndviStats.mean,
            ndvi_min: ndviStats.min,
            ndvi_max: ndviStats.max,
            ndvi_std_dev: ndviStats.stDev,
            cloud_cover: cloudCover,
            ndvi_thumbnail_url: publicUrl,
            bbox: bbox,
            expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }, {
            onConflict: 'land_id,acquisition_date'
          });

        if (insertError) {
          console.error(`[update-ndvi-tiles] Insert error:`, insertError);
          throw insertError;
        }

        results.processed++;
        results.updated++;
        console.log(`[update-ndvi-tiles] ✓ Completed ${land.name}`);

      } catch (error) {
        console.error(`[update-ndvi-tiles] Error processing ${land.name}:`, error);
        results.processed++;
        results.errors.push({
          land: land.name,
          error: error.message
        });
      }
    }

    console.log('\n[update-ndvi-tiles] Summary:', results);

    return new Response(
      JSON.stringify({
        success: true,
        data: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[update-ndvi-tiles] Fatal error:', error);
    return handleError(error, 500, req);
  }
});
