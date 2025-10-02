import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Copernicus DataSpace API endpoints
const COPERNICUS_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const COPERNICUS_CATALOG_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1";
const COPERNICUS_DOWNLOAD_URL = "https://download.dataspace.copernicus.eu";

// Indian agricultural regions (same as before)
const INDIAN_AGRICULTURAL_REGIONS = {
  "Punjab": { bbox: [73.87, 29.53, 77.10, 32.51] },
  "Haryana": { bbox: [74.48, 27.65, 77.61, 30.92] },
  "Uttar Pradesh": { bbox: [77.09, 23.87, 84.64, 30.40] },
  "Rajasthan": { bbox: [69.48, 23.03, 78.27, 30.19] },
  "Gujarat": { bbox: [68.13, 20.13, 74.48, 24.70] },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      startDate = '2024-01-01', 
      endDate = '2024-12-31',
      cloudCoverage = 30,
      regions = ['Punjab', 'Haryana'],
      lightweight = true
    } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OAuth token from Copernicus
    const clientId = Deno.env.get('COPERNICUS_CLIENT_ID');
    const clientSecret = Deno.env.get('COPERNICUS_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Copernicus OAuth credentials not configured');
    }

    console.log('Fetching OAuth token from Copernicus...');
    
    const tokenResponse = await fetch(COPERNICUS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token fetch failed:', errorText);
      throw new Error(`Failed to obtain OAuth token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('Successfully obtained OAuth token');

    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: [],
    };

    // Process each region
    for (const regionName of regions) {
      const region = INDIAN_AGRICULTURAL_REGIONS[regionName];
      if (!region) {
        results.errors.push(`Unknown region: ${regionName}`);
        continue;
      }

      try {
        console.log(`Processing region: ${regionName}`);
        
        // Build OData query for Sentinel-2 L2A products
        const bbox = region.bbox;
        const filterQuery = [
          `Collection/Name eq 'SENTINEL-2'`,
          `ContentDate/Start ge ${startDate}T00:00:00.000Z`,
          `ContentDate/Start le ${endDate}T23:59:59.999Z`,
          `Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/OData.CSC.DoubleAttribute/Value le ${cloudCoverage})`,
          `OData.CSC.Intersects(area=geography'SRID=4326;POLYGON((${bbox[0]} ${bbox[1]},${bbox[2]} ${bbox[1]},${bbox[2]} ${bbox[3]},${bbox[0]} ${bbox[3]},${bbox[0]} ${bbox[1]}))')`
        ].join(' and ');

        const catalogUrl = `${COPERNICUS_CATALOG_URL}/Products?$filter=${encodeURIComponent(filterQuery)}&$orderby=ContentDate/Start desc&$top=10`;
        
        console.log('Searching catalog:', catalogUrl);
        
        const searchResponse = await fetch(catalogUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error('Catalog search failed:', errorText);
          throw new Error(`Catalog search failed: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        const products = searchData.value || [];

        console.log(`Found ${products.length} products for ${regionName}`);

        // Process each product
        for (const product of products) {
          const tileId = product.Name || product.Id;
          const acquisitionDate = product.ContentDate?.Start || product.ContentDate?.End;
          
          // Extract metadata
          const cloudCover = product.Attributes?.find((attr: any) => 
            attr.Name === 'cloudCover'
          )?.Value || 0;

          // For lightweight processing, store only metadata and URLs
          const metadata = {
            product_id: product.Id,
            product_name: product.Name,
            region: regionName,
            bbox: region.bbox,
            size_mb: product.ContentLength ? (product.ContentLength / (1024 * 1024)).toFixed(2) : null,
            processing_level: product.Attributes?.find((attr: any) => 
              attr.Name === 'processingLevel'
            )?.Value || 'L2A',
            data_source: 'copernicus',
            download_url: `${COPERNICUS_DOWNLOAD_URL}/odata/v1/Products(${product.Id})/$value`,
            quicklook_url: `${COPERNICUS_DOWNLOAD_URL}/odata/v1/Products(${product.Id})/Quicklook`,
            tile_geometry: product.GeoFootprint || null,
          };

          // Prepare tile data
          const tileData = {
            tile_id: tileId,
            acquisition_date: acquisitionDate ? new Date(acquisitionDate).toISOString() : null,
            cloud_cover: cloudCover,
            status: 'metadata_only',
            metadata: metadata,
            resolution: 'R60m',
            data_source: 'copernicus',
            processing_method: 'metadata_fetch',
            copernicus_red_band_url: metadata.download_url,
            copernicus_nir_band_url: metadata.download_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Check if tile already exists
          const { data: existingTile, error: checkError } = await supabase
            .from('satellite_tiles')
            .select('id, status')
            .eq('tile_id', tileId)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing tile:', checkError);
            continue;
          }

          if (!existingTile) {
            // Insert new tile
            const { error: insertError } = await supabase
              .from('satellite_tiles')
              .insert(tileData);

            if (insertError) {
              console.error(`Error inserting tile ${tileId}:`, insertError);
              results.errors.push(`Insert failed for ${tileId}: ${insertError.message}`);
            } else {
              results.inserted++;
              console.log(`Inserted tile: ${tileId}`);
            }
          } else {
            // Update existing tile metadata
            const { error: updateError } = await supabase
              .from('satellite_tiles')
              .update({
                metadata: metadata,
                updated_at: new Date().toISOString(),
                data_source: 'copernicus_metadata',
              })
              .eq('id', existingTile.id);

            if (updateError) {
              console.error(`Error updating tile ${tileId}:`, updateError);
              results.errors.push(`Update failed for ${tileId}: ${updateError.message}`);
            } else {
              results.updated++;
              console.log(`Updated tile: ${tileId}`);
            }
          }

          results.processed++;
        }
      } catch (error) {
        console.error(`Error processing region ${regionName}:`, error);
        results.errors.push(`Region ${regionName}: ${error.message}`);
      }
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} tiles from Copernicus DataSpace`,
        results: results,
        dataSource: 'copernicus',
        authentication: 'oauth2',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in fetch-copernicus-ndvi function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to fetch data from Copernicus DataSpace',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});