import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

// Copernicus Data Space Ecosystem API endpoints
const COPERNICUS_STAC_API = 'https://stac.dataspace.copernicus.eu/v1/search';
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
 * Extract bounding box from PostGIS geometry
 */
function extractBboxFromGeometry(geometry: any): number[] | null {
  try {
    // Geometry is GeoJSON format
    if (geometry && geometry.coordinates) {
      const coords = geometry.coordinates[0]; // Polygon exterior ring
      const lons = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);
      return [
        Math.min(...lons), // west
        Math.min(...lats), // south
        Math.max(...lons), // east
        Math.max(...lats)  // north
      ];
    }
    return null;
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
 * Generate NDVI visualization using Process API
 */
async function generateNDVI(
  token: string,
  bbox: number[],
  dateFrom: string,
  dateTo: string
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
          timeRange: { from: dateFrom, to: dateTo },
          maxCloudCoverage: 20
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

  const response = await fetch(COPERNICUS_PROCESS_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(processPayload)
  });

  if (!response.ok) {
    throw new Error(`Process API failed: ${response.statusText}`);
  }

  const imageBlob = await response.blob();
  return { imageBlob, metadata: { width: 512, height: 512 } };
}

/**
 * Calculate NDVI statistics using Statistical API
 */
async function calculateNDVIStats(
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

  const statsPayload = {
    input: {
      bounds: {
        bbox: bbox,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: { from: dateFrom, to: dateTo },
          maxCloudCoverage: 20
        }
      }]
    },
    aggregation: {
      timeRange: { from: dateFrom, to: dateTo },
      aggregationInterval: { of: "P1D" },
      evalscript: statsEvalscript,
      resx: 10,
      resy: 10
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

  const response = await fetch(COPERNICUS_STATISTICAL_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(statsPayload)
  });

  if (!response.ok) {
    throw new Error(`Statistical API failed: ${response.statusText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[fetch-copernicus-ndvi] Starting MGRS-based NDVI sync');
    
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      cloudCoverage = 20,
      regions = ['Punjab', 'Haryana'],
      tileIds = [] // Optional: specific MGRS tile IDs
    } = await req.json().catch(() => ({})); // Handle empty body

    console.log('[fetch-copernicus-ndvi] Parameters:', { startDate, endDate, cloudCoverage, regions, tileIds });

    // Get credentials from environment
    const clientId = Deno.env.get("COPERNICUS_CLIENT_ID");
    const clientSecret = Deno.env.get("COPERNICUS_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      const errorMsg = 'Copernicus credentials not configured. Please add COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET secrets.';
      console.error('[fetch-copernicus-ndvi]', errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log('[fetch-copernicus-ndvi] Credentials found, proceeding...');

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if storage bucket exists, create if not
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'ndvi-tiles');
    
    if (!bucketExists) {
      console.log('[fetch-copernicus-ndvi] Creating ndvi-tiles storage bucket...');
      const { error: bucketError } = await supabase.storage.createBucket('ndvi-tiles', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/png', 'image/jpeg']
      });
      
      if (bucketError) {
        console.error('[fetch-copernicus-ndvi] Bucket creation error:', bucketError);
      } else {
        console.log('[fetch-copernicus-ndvi] Storage bucket created successfully');
      }
    } else {
      console.log('[fetch-copernicus-ndvi] Storage bucket already exists');
    }

    // Step 1: Fetch MGRS tiles from the database (ALL tiles to check for agriculture)
    console.log('[fetch-copernicus-ndvi] Fetching MGRS tiles from database...');
    
    let mgrsTilesQuery = supabase
      .from('mgrs_tiles')
      .select('id, tile_id, country_id, state, geometry, is_agri, agri_area_km2');
    // Note: NOT filtering by is_agri - we'll check all tiles and determine agricultural areas

    // Filter by specific tile IDs if provided
    if (tileIds && tileIds.length > 0) {
      mgrsTilesQuery = mgrsTilesQuery.in('tile_id', tileIds);
    }
    
    // Filter by regions/states if state data is available and regions specified
    if (regions && regions.length > 0 && !regions.includes('All Regions (state data not populated)')) {
      // Only filter if states are populated in the database
      mgrsTilesQuery = mgrsTilesQuery.in('state', regions);
    }
    
    // Limit processing to avoid timeouts
    mgrsTilesQuery = mgrsTilesQuery.limit(50);

    const { data: mgrsTiles, error: mgrsTilesError } = await mgrsTilesQuery;

    if (mgrsTilesError) {
      throw new Error(`Failed to fetch MGRS tiles: ${mgrsTilesError.message}`);
    }

    if (!mgrsTiles || mgrsTiles.length === 0) {
      console.log('[fetch-copernicus-ndvi] No MGRS tiles found matching criteria');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No MGRS tiles found matching criteria. Please ensure tiles are loaded in mgrs_tiles table.',
          results: { processed: 0, inserted: 0, updated: 0, errors: [] }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-copernicus-ndvi] Found ${mgrsTiles.length} MGRS tiles to process`);
    console.log(`[fetch-copernicus-ndvi] First tile sample:`, {
      tile_id: mgrsTiles[0].tile_id,
      has_geometry: !!mgrsTiles[0].geometry,
      is_agri: mgrsTiles[0].is_agri
    });

    // Get OAuth token
    console.log('[fetch-copernicus-ndvi] Authenticating with Copernicus...');
    const token = await getCopernicusToken(clientId, clientSecret);

    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: [],
      tiles: []
    };

    // Step 2: Process each MGRS tile
    for (const mgrsTile of mgrsTiles) {
      try {
        console.log(`[fetch-copernicus-ndvi] Processing MGRS tile: ${mgrsTile.tile_id}`);

        // Extract bounding box from geometry
        const bbox = extractBboxFromGeometry(mgrsTile.geometry);
        
        if (!bbox) {
          console.error(`[fetch-copernicus-ndvi] No valid bbox for tile ${mgrsTile.tile_id}`);
          results.errors.push({ tile: mgrsTile.tile_id, error: 'Invalid geometry' });
          continue;
        }

        // Query STAC API for this specific MGRS tile
        const stacPayload = {
          collections: ["sentinel-2-l2a"],
          bbox: bbox,
          datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
          query: {
            "s2:mgrs_tile": { "eq": mgrsTile.tile_id },
            "eo:cloud_cover": { "lt": cloudCoverage }
          },
          limit: 1, // Get most recent
          sortby: [{ field: "datetime", direction: "desc" }]
        };

        const stacResponse = await fetch(COPERNICUS_STAC_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stacPayload)
        });

        if (!stacResponse.ok) {
          throw new Error(`STAC search failed: ${stacResponse.statusText}`);
        }

        const stacData = await stacResponse.json();

        if (!stacData.features || stacData.features.length === 0) {
          console.log(`[fetch-copernicus-ndvi] No Sentinel-2 data found for tile ${mgrsTile.tile_id}`);
          results.processed++;
          continue;
        }

        const feature = stacData.features[0];
        const properties = feature.properties || {};
        const acquisitionDate = properties.datetime ? 
          new Date(properties.datetime).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0];

        // Check if we already have this tile data
        const { data: existingTile } = await supabase
          .from('satellite_tiles')
          .select('id')
          .eq('tile_id', mgrsTile.tile_id)
          .eq('acquisition_date', acquisitionDate)
          .single();

        const tileRecord = {
          tile_id: mgrsTile.tile_id,
          mgrs_tile_id: mgrsTile.id, // Link to MGRS tiles table
          acquisition_date: acquisitionDate,
          cloud_cover: properties['eo:cloud_cover'] || 0,
          collection: "sentinel-2-l2a",
          status: 'pending',
          country_id: mgrsTile.country_id,
          metadata: {
            tile_id: mgrsTile.tile_id,
            state: mgrsTile.state,
            bbox: bbox,
            scene_id: feature.id,
            agri_area_km2: mgrsTile.agri_area_km2
          },
          file_size_mb: 0,
          created_at: new Date().toISOString(),
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
          // Calculate statistics FIRST to determine if agricultural
          const stats = await calculateNDVIStats(token, bbox, startDate, endDate);
          const ndviStats = stats.data?.[0]?.outputs?.default?.bands?.ndvi?.stats || {};
          
          // Determine if tile is agricultural based on NDVI mean
          // NDVI > 0.2 typically indicates vegetation/agricultural land
          const ndviMean = ndviStats.mean || 0;
          const isAgricultural = ndviMean > 0.2 && ndviMean < 0.9;
          
          console.log(`[fetch-copernicus-ndvi] Tile ${mgrsTile.tile_id} NDVI mean: ${ndviMean}, Agricultural: ${isAgricultural}`);
          
          // Update MGRS tile with agricultural classification
          if (isAgricultural && !mgrsTile.is_agri) {
            await supabase
              .from('mgrs_tiles')
              .update({
                is_agri: true,
                agri_area_km2: calculateAreaFromBbox(bbox) // Approximate area
              })
              .eq('id', mgrsTile.id);
            
            console.log(`[fetch-copernicus-ndvi] Marked tile ${mgrsTile.tile_id} as agricultural`);
          }
          
          // Only generate and download NDVI visualization if agricultural
          if (!isAgricultural) {
            console.log(`[fetch-copernicus-ndvi] Skipping non-agricultural tile ${mgrsTile.tile_id}`);
            
            // Update satellite tile to mark as non-agricultural
            await supabase
              .from('satellite_tiles')
              .update({
                status: 'skipped',
                error_message: 'Non-agricultural area (NDVI < 0.2)',
                ndvi_mean: ndviMean,
                updated_at: new Date().toISOString()
              })
              .eq('id', tileDbId);
            
            results.processed++;
            continue;
          }

          // Generate NDVI visualization for agricultural tiles
          const { imageBlob, metadata: imgMeta } = await generateNDVI(
            token,
            bbox,
            startDate,
            endDate
          );

          // Upload to storage
          const fileName = `${mgrsTile.tile_id}_${acquisitionDate}_ndvi.png`;
          const { data: uploadData, error: uploadError } = await supabase
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

          console.log(`[fetch-copernicus-ndvi] Successfully processed agricultural tile ${mgrsTile.tile_id}`);
          
          results.tiles.push({
            tile_id: mgrsTile.tile_id,
            mgrs_tile_id: mgrsTile.id,
            state: mgrsTile.state,
            status: 'ready'
          });

        } catch (processError) {
          console.error(`[fetch-copernicus-ndvi] Error processing tile ${mgrsTile.tile_id}:`, processError);
          
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
    console.log('[fetch-copernicus-ndvi] Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${mgrsTiles.length} MGRS tiles from database`,
        results,
        dataSource: 'copernicus',
        mgrsTilesProcessed: mgrsTiles.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[fetch-copernicus-ndvi] Function error:', error);
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
