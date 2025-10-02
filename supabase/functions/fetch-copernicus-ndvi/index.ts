import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

// Copernicus Data Space Ecosystem API endpoints
const COPERNICUS_STAC_API = 'https://stac.dataspace.copernicus.eu/v1/search';
const COPERNICUS_PROCESS_API = 'https://sh.dataspace.copernicus.eu/api/v1/process';
const COPERNICUS_STATISTICAL_API = 'https://sh.dataspace.copernicus.eu/api/v1/statistics';
const COPERNICUS_AUTH_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

// Agricultural regions for India
const AGRICULTURAL_REGIONS = {
  'Punjab': { west: 74.5, south: 30.0, east: 76.5, north: 32.5 },
  'Haryana': { west: 75.0, south: 27.5, east: 77.5, north: 30.5 },
  'Uttar Pradesh': { west: 77.0, south: 24.0, east: 84.5, north: 30.5 }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log('[fetch-copernicus-ndvi] Starting Copernicus NDVI sync');
    
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0],
      cloudCoverage = 20,
      regions = ['Punjab', 'Haryana']
    } = await req.json();

    // Get credentials from environment
    const clientId = Deno.env.get("COPERNICUS_CLIENT_ID");
    const clientSecret = Deno.env.get("COPERNICUS_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error('Copernicus credentials not configured');
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OAuth token
    console.log('[fetch-copernicus-ndvi] Authenticating with Copernicus...');
    const token = await getCopernicusToken(clientId, clientSecret);

    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: [],
      regions_processed: [],
      tiles: []
    };

    // Process each region
    for (const regionName of regions) {
      const region = AGRICULTURAL_REGIONS[regionName];
      if (!region) continue;

      console.log(`[fetch-copernicus-ndvi] Processing region: ${regionName}`);

      try {
        // Query STAC for tiles
        const stacPayload = {
          collections: ["sentinel-2-l2a"],
          bbox: [region.west, region.south, region.east, region.north],
          datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
          query: {
            "eo:cloud_cover": { "lt": cloudCoverage }
          },
          limit: 5
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
        console.log(`[fetch-copernicus-ndvi] Found ${stacData.features?.length || 0} tiles`);

        // Process each tile
        for (const feature of stacData.features || []) {
          const properties = feature.properties || {};
          const tileId = properties['s2:mgrs_tile'] || 'UNKNOWN';
          const acquisitionDate = properties.datetime ? 
            new Date(properties.datetime).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0];

          console.log(`[fetch-copernicus-ndvi] Processing tile ${tileId}`);

          // Create pending record
          const { data: existingTile } = await supabase
            .from('satellite_tiles')
            .select('id')
            .eq('tile_id', tileId)
            .eq('acquisition_date', acquisitionDate)
            .single();

          const tileBbox = feature.bbox || [region.west, region.south, region.east, region.north];

          const tileRecord = {
            tile_id: tileId,
            acquisition_date: acquisitionDate,
            cloud_cover: properties['eo:cloud_cover'] || 0,
            collection: "sentinel-2-l2a",
            status: 'pending',
            metadata: {
              tile_id: tileId,
              region: regionName,
              bbox: tileBbox,
              scene_id: feature.id
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
            // Generate NDVI visualization
            const { imageBlob, metadata: imgMeta } = await generateNDVI(
              token,
              tileBbox,
              startDate,
              endDate
            );

            // Upload to storage
            const fileName = `${tileId}_${acquisitionDate}_ndvi.png`;
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

            // Calculate statistics
            const stats = await calculateNDVIStats(token, tileBbox, startDate, endDate);
            
            const ndviStats = stats.data?.[0]?.outputs?.default?.bands?.ndvi?.stats || {};
            
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
                processing_completed_at: new Date().toISOString(),
                error_message: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', tileDbId);

            console.log(`[fetch-copernicus-ndvi] Successfully processed tile ${tileId}`);
            
            results.tiles.push({
              tile_id: tileId,
              region: regionName,
              status: 'ready'
            });

          } catch (processError) {
            console.error(`[fetch-copernicus-ndvi] Error processing tile ${tileId}:`, processError);
            
            await supabase
              .from('satellite_tiles')
              .update({
                status: 'error',
                error_message: processError.message,
                updated_at: new Date().toISOString()
              })
              .eq('id', tileDbId);

            results.errors.push({ tile: tileId, error: processError.message });
          }
        }

        results.regions_processed.push(regionName);
      } catch (regionError) {
        console.error(`[fetch-copernicus-ndvi] Region error:`, regionError);
        results.errors.push({ region: regionName, error: regionError.message });
      }
    }

    results.processed = results.inserted + results.updated;
    console.log('[fetch-copernicus-ndvi] Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Copernicus NDVI sync completed`,
        results,
        dataSource: 'copernicus'
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
