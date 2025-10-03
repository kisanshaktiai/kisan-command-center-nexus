import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

// Copernicus Data Space Ecosystem API endpoints - UPDATED TO USE CATALOG API
const COPERNICUS_CATALOG_API = 'https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search';
const COPERNICUS_PROCESS_API = 'https://sh.dataspace.copernicus.eu/api/v1/process';
const COPERNICUS_STATISTICAL_API = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';
const COPERNICUS_AUTH_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculate approximate area from bounding box (in km²)
 */
function calculateAreaFromBbox(bbox: number[]): number {
  const [west, south, east, north] = bbox;
  const width = (east - west) * 111.32; // km per degree longitude at equator
  const height = (north - south) * 110.57; // km per degree latitude
  return Math.round(width * height);
}

/**
 * Extract bounding box from PostGIS geometry with validation
 * Handles both Polygon and MultiPolygon geometries
 */
function extractBboxFromGeometry(geometry: any): number[] | null {
  try {
    if (!geometry || !geometry.coordinates) {
      console.error('Geometry is null or missing coordinates');
      return null;
    }

    let coords: number[][];
    
    // Handle both MultiPolygon and Polygon geometry types
    if (geometry.type === 'MultiPolygon') {
      // For MultiPolygon: coordinates[0][0] = first polygon's exterior ring
      coords = geometry.coordinates[0][0];
    } else if (geometry.type === 'Polygon') {
      // For Polygon: coordinates[0] = exterior ring
      coords = geometry.coordinates[0];
    } else {
      console.error('Unsupported geometry type:', geometry.type);
      return null;
    }

    if (!coords || coords.length === 0) {
      console.error('Coordinates array is empty');
      return null;
    }

    const lons = coords.map((c: number[]) => c[0]).filter((n: number) => !isNaN(n));
    const lats = coords.map((c: number[]) => c[1]).filter((n: number) => !isNaN(n));

    if (lons.length === 0 || lats.length === 0) {
      console.error('No valid coordinates found');
      return null;
    }

    const bbox = [
      Math.min(...lons), // west
      Math.min(...lats), // south
      Math.max(...lons), // east
      Math.max(...lats)  // north
    ];

    // Validate bbox values
    if (bbox.some(n => isNaN(n) || n === null || n === undefined)) {
      console.error('Invalid bbox values:', bbox);
      return null;
    }

    console.log(`Extracted bbox from ${geometry.type}:`, bbox);
    return bbox;
  } catch (error) {
    console.error('Failed to extract bbox:', error);
    return null;
  }
}

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
 * Search for Sentinel-2 data using Catalog API (replaces STAC)
 */
async function searchCatalog(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string,
  cloudCoverage: number
): Promise<any> {
  // Sentinel Hub Catalog API uses CQL2 filter format, not STAC query
  const catalogPayload = {
    bbox: bbox,
    datetime: `${dateFrom}T00:00:00Z/${dateTo}T23:59:59Z`,
    collections: ["sentinel-2-l2a"],
    limit: 1,
    filter: `eo:cloud_cover < ${cloudCoverage}` // CQL2 text filter
  };

  console.log('[Catalog API] Request:', JSON.stringify(catalogPayload, null, 2));

  const response = await fetch(COPERNICUS_CATALOG_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(catalogPayload)
  });

  console.log(`[Catalog API] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Catalog API] Error:', errorText);
    throw new Error(`Catalog API failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[Catalog API] Found ${data.features?.length || 0} features`);
  return data;
}

/**
 * Generate NDVI visualization using Process API
 */
async function generateNDVI(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string,
  cloudCoverage: number
): Promise<{ imageBlob: Blob; metadata: any }> {
  const evalscript = `
    //VERSION=3
    function setup() {
      return {
        input: [{
          bands: ["B04", "B08"],
          units: "DN"
        }],
        output: {
          bands: 3,
          sampleType: "AUTO"
        }
      };
    }
    
    function evaluatePixel(sample) {
      let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
      
      // Color mapping for NDVI visualization
      if (ndvi < -0.1) return [0.5, 0.5, 1]; // Water - blue
      if (ndvi < 0.1) return [0.9, 0.9, 0.8]; // Bare soil - beige
      if (ndvi < 0.3) return [1, 1, 0.5]; // Sparse vegetation - light yellow
      if (ndvi < 0.5) return [0.8, 1, 0.4]; // Moderate vegetation - light green
      if (ndvi < 0.7) return [0.2, 0.8, 0.2]; // Dense vegetation - green
      return [0, 0.5, 0]; // Very dense vegetation - dark green
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

  console.log('[Process API] Generating NDVI image...');

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

  const imageBlob = await response.blob();
  console.log(`[Process API] Generated image: ${imageBlob.size} bytes`);
  return { imageBlob, metadata: { width: 512, height: 512 } };
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

  // Calculate appropriate resolution based on bbox size to stay within 1500m/pixel limit
  const bboxWidth = bbox[2] - bbox[0]; // degrees
  const bboxHeight = bbox[3] - bbox[1]; // degrees
  const widthKm = bboxWidth * 111.32; // approximate km
  const heightKm = bboxHeight * 110.57; // approximate km
  
  // For Statistical API: Calculate resolution that keeps us under 1500m/pixel
  // Formula: resolution (m/px) = (bbox_size_meters) / (max_pixels)
  // Sentinel Hub allows max 2500x2500 pixels, but we use 512x512 for efficiency
  const maxPixels = 512;
  const maxMetersPerPixel = 1400; // Stay under 1500m/pixel limit
  
  // Calculate minimum resolution needed to fit bbox in maxPixels
  const minResolutionForWidth = (widthKm * 1000) / maxPixels;
  const minResolutionForHeight = (heightKm * 1000) / maxPixels;
  const calculatedResolution = Math.max(minResolutionForWidth, minResolutionForHeight);
  
  // Clamp resolution to valid range (10m to 1400m) and round to nearest 10m
  let resolution = Math.max(10, Math.min(maxMetersPerPixel, Math.ceil(calculatedResolution / 10) * 10));
  
  // Round to nearest valid Sentinel-2 resolution tier for better caching
  if (resolution <= 10) resolution = 10;
  else if (resolution <= 20) resolution = 20;
  else if (resolution <= 60) resolution = 60;
  else resolution = Math.ceil(resolution / 100) * 100; // Round to nearest 100m for large areas
  
  console.log(`[Statistical API] Bbox: ${widthKm.toFixed(2)}km x ${heightKm.toFixed(2)}km, Calculated: ${calculatedResolution.toFixed(0)}m, Using resolution: ${resolution}m`);

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
      resx: resolution,
      resy: resolution
    },
    calculations: {
      default: {
        statistics: {
          default: {
            percentiles: {
              k: [10, 25, 50, 75, 90]
            }
          }
        },
        histograms: {
          default: {
            nBins: 20,
            lowEdge: -1.0,
            highEdge: 1.0
          }
        }
      }
    }
  };

  console.log('[Statistical API] Calculating NDVI statistics...');

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
  console.log('[Statistical API] Stats calculated successfully');
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[fetch-copernicus-ndvi] Starting MGRS-based NDVI sync with Catalog API');
    
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      cloudCoverage = 20,
      regions = ['Punjab', 'Haryana'],
      tileIds = []
    } = await req.json().catch(() => ({}));

    console.log('[fetch-copernicus-ndvi] Parameters:', { startDate, endDate, cloudCoverage, regions, tileIds });

    // Get credentials
    const clientId = Deno.env.get("COPERNICUS_CLIENT_ID");
    const clientSecret = Deno.env.get("COPERNICUS_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error('Copernicus credentials not configured');
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Ensure storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'ndvi-tiles');
    
    if (!bucketExists) {
      console.log('[fetch-copernicus-ndvi] Creating ndvi-tiles bucket...');
      await supabase.storage.createBucket('ndvi-tiles', {
        public: true,
        fileSizeLimit: 52428800,
        allowedMimeTypes: ['image/png', 'image/jpeg']
      });
    }

    // Fetch MGRS tiles
    let mgrsTilesQuery = supabase
      .from('mgrs_tiles')
      .select('id, tile_id, country_id, state, geometry, is_agri, agri_area_km2');

    if (tileIds && tileIds.length > 0) {
      mgrsTilesQuery = mgrsTilesQuery.in('tile_id', tileIds);
    }
    
    if (regions && regions.length > 0 && !regions.includes('All Regions (state data not populated)')) {
      mgrsTilesQuery = mgrsTilesQuery.in('state', regions);
    }
    
    mgrsTilesQuery = mgrsTilesQuery.limit(50);

    const { data: mgrsTiles, error: mgrsTilesError } = await mgrsTilesQuery;

    if (mgrsTilesError) {
      throw new Error(`Failed to fetch MGRS tiles: ${mgrsTilesError.message}`);
    }

    if (!mgrsTiles || mgrsTiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No MGRS tiles found',
          results: { processed: 0, inserted: 0, updated: 0, errors: [] }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-copernicus-ndvi] Found ${mgrsTiles.length} MGRS tiles`);

    // Get OAuth token
    console.log('[fetch-copernicus-ndvi] Authenticating...');
    const token = await getCopernicusToken(clientId, clientSecret);

    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      markedAsAgricultural: 0,
      skippedNonAgricultural: 0,
      errors: [],
      tiles: []
    };

    // Process each tile
    for (const mgrsTile of mgrsTiles) {
      try {
        console.log(`\n[fetch-copernicus-ndvi] Processing tile: ${mgrsTile.tile_id}`);

        // Extract and validate bbox
        const bbox = extractBboxFromGeometry(mgrsTile.geometry);
        
        if (!bbox) {
          console.error(`[fetch-copernicus-ndvi] Invalid bbox for ${mgrsTile.tile_id}`);
          results.errors.push({ tile: mgrsTile.tile_id, error: 'Invalid geometry/bbox' });
          continue;
        }

        // Search catalog for available data
        const catalogData = await searchCatalog(token, bbox, startDate, endDate, cloudCoverage);

        if (!catalogData.features || catalogData.features.length === 0) {
          console.log(`[fetch-copernicus-ndvi] No data found for ${mgrsTile.tile_id}`);
          results.processed++;
          continue;
        }

        const feature = catalogData.features[0];
        const properties = feature.properties || {};
        const acquisitionDate = properties.datetime ? 
          new Date(properties.datetime).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0];

        // Check existing tile
        const { data: existingTile } = await supabase
          .from('satellite_tiles')
          .select('id')
          .eq('tile_id', mgrsTile.tile_id)
          .eq('acquisition_date', acquisitionDate)
          .maybeSingle();

        const tileRecord = {
          tile_id: mgrsTile.tile_id,
          mgrs_tile_id: mgrsTile.id,
          acquisition_date: acquisitionDate,
          cloud_cover: properties['eo:cloud_cover'] || 0,
          collection: "sentinel-2-l2a",
          status: 'pending',
          country_id: mgrsTile.country_id,
          metadata: {
            tile_id: mgrsTile.tile_id,
            state: mgrsTile.state,
            bbox: bbox,
            scene_id: feature.id
          },
          file_size_mb: 0,
          updated_at: new Date().toISOString()
        };

        let tileDbId: string;

        if (existingTile) {
          await supabase
            .from('satellite_tiles')
            .update({ ...tileRecord, status: 'pending' })
            .eq('id', existingTile.id);
          tileDbId = existingTile.id;
          results.updated++;
        } else {
          const { data: newTile } = await supabase
            .from('satellite_tiles')
            .insert(tileRecord)
            .select('id')
            .single();
          tileDbId = newTile?.id!;
          results.inserted++;
        }

        try {
          // Calculate NDVI statistics
          const stats = await calculateNDVIStats(token, bbox, startDate, endDate, cloudCoverage);
          const ndviStats = stats.data?.[0]?.outputs?.default?.bands?.ndvi?.stats || {};
          
          const ndviMean = ndviStats.mean || 0;
          const ndviMin = ndviStats.min || 0;
          const ndviMax = ndviStats.max || 0;
          
          // Agricultural classification
          const isAgricultural = ndviMean > 0.2 && ndviMean < 0.8 && ndviMax > 0.3;
          
          console.log(`[fetch-copernicus-ndvi] NDVI Analysis:`, {
            mean: ndviMean.toFixed(3),
            min: ndviMin.toFixed(3),
            max: ndviMax.toFixed(3),
            isAgricultural
          });
          
          // Update MGRS tile classification
          if (isAgricultural && !mgrsTile.is_agri) {
            await supabase
              .from('mgrs_tiles')
              .update({
                is_agri: true,
                agri_area_km2: calculateAreaFromBbox(bbox)
              })
              .eq('id', mgrsTile.id);
            
            results.markedAsAgricultural++;
            console.log(`[fetch-copernicus-ndvi] ✓ Marked as agricultural`);
          }
          
          // Skip non-agricultural
          if (!isAgricultural) {
            console.log(`[fetch-copernicus-ndvi] ✗ Skipping non-agricultural tile`);
            
            await supabase
              .from('satellite_tiles')
              .update({
                status: 'skipped',
                error_message: `Non-agricultural (NDVI: ${ndviMean.toFixed(3)})`,
                ndvi_mean: ndviMean,
                updated_at: new Date().toISOString()
              })
              .eq('id', tileDbId);
            
            results.skippedNonAgricultural++;
            results.processed++;
            continue;
          }

          // Generate NDVI visualization
          const { imageBlob } = await generateNDVI(token, bbox, startDate, endDate, cloudCoverage);

          // Upload to storage
          const fileName = `${mgrsTile.tile_id}_${acquisitionDate}_ndvi.png`;
          const { error: uploadError } = await supabase
            .storage
            .from('ndvi-tiles')
            .upload(fileName, imageBlob, {
              contentType: 'image/png',
              upsert: true
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase
            .storage
            .from('ndvi-tiles')
            .getPublicUrl(fileName);
          
          // Update tile with results
          await supabase
            .from('satellite_tiles')
            .update({
              status: 'ready',
              ndvi_path: publicUrl,
              file_size_mb: imageBlob.size / (1024 * 1024),
              ndvi_mean: ndviStats.mean || null,
              ndvi_min: ndviStats.min || null,
              ndvi_max: ndviStats.max || null,
              ndvi_std_dev: ndviStats.stDev || null,
              ndvi_statistics: stats.data?.[0] || {},
              processing_stage: 'ndvi_calculated',
              processing_completed_at: new Date().toISOString(),
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', tileDbId);

          console.log(`[fetch-copernicus-ndvi] ✓ Successfully processed ${mgrsTile.tile_id}`);
          
          results.tiles.push({
            tile_id: mgrsTile.tile_id,
            state: mgrsTile.state,
            status: 'ready'
          });

        } catch (processError) {
          console.error(`[fetch-copernicus-ndvi] Processing error:`, processError);
          
          await supabase
            .from('satellite_tiles')
            .update({
              status: 'error',
              error_message: processError.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', tileDbId);

          results.errors.push({ tile: mgrsTile.tile_id, error: processError.message });
        }
      } catch (tileError) {
        console.error(`[fetch-copernicus-ndvi] Tile error:`, tileError);
        results.errors.push({ tile: mgrsTile.tile_id, error: tileError.message });
      }
    }

    results.processed = results.inserted + results.updated;
    console.log('\n[fetch-copernicus-ndvi] ✓ Complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Analyzed ${mgrsTiles.length} tiles: ${results.markedAsAgricultural} newly agricultural, ${results.skippedNonAgricultural} skipped, ${results.processed} processed`,
        results,
        dataSource: 'copernicus-catalog-api'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[fetch-copernicus-ndvi] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
