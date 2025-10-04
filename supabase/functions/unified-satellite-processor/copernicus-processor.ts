// Copernicus Sentinel Hub processor with COG download support

export async function processCopernicus(supabase: any, params: {
  startDate: string;
  endDate: string;
  cloudCoverage: number;
  regions: string[];
  landIds: string[];
  tileIds: string[];
  downloadFiles: boolean;
  forceRefresh: boolean;
}) {
  console.log('[Copernicus] Processing with Copernicus Sentinel Hub');

  const CATALOG_URL = 'https://catalogue.dataspace.copernicus.eu/stac';
  const AUTH_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

  // Get OAuth token
  const token = await getCopernicusToken(AUTH_URL);
  
  // Get lands to process
  const { data: lands, error: landsError } = await supabase
    .from('lands')
    .select('id, tenant_id, boundary, mgrs_tile_id')
    .in('mgrs_tile_id', params.tileIds.length > 0 ? params.tileIds : undefined);

  if (landsError) {
    throw new Error(`Failed to fetch lands: ${landsError.message}`);
  }

  console.log(`[Copernicus] Found ${lands?.length || 0} lands to process`);

  let processed = 0;
  let success = 0;
  const results = [];

  for (const land of lands || []) {
    try {
      if (!land.boundary?.coordinates) {
        console.log(`[Copernicus] Land ${land.id} has no boundary, skipping`);
        continue;
      }

      // Extract bbox from land boundary
      const coords = land.boundary.coordinates[0];
      const lons = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);
      const bbox = [
        Math.min(...lons), 
        Math.min(...lats),
        Math.max(...lons),
        Math.max(...lats)
      ];

      console.log(`[Copernicus] Searching catalog for land ${land.id}, bbox: ${bbox}`);

      // Search STAC catalog
      const searchResponse = await fetch(`${CATALOG_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collections: ['SENTINEL-2'],
          bbox: bbox,
          datetime: `${params.startDate}T00:00:00Z/${params.endDate}T23:59:59Z`,
          query: {
            'eo:cloud_cover': { 'lt': params.cloudCoverage }
          },
          fields: {
            include: ['assets.B04', 'assets.B08', 'properties']
          },
          limit: 5
        })
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`Catalog search failed: ${searchResponse.statusText} - ${errorText}`);
      }

      const searchData = await searchResponse.json();
      const scenes = searchData.features || [];

      console.log(`[Copernicus] Found ${scenes.length} scenes for land ${land.id}`);

      if (scenes.length === 0) {
        console.log(`[Copernicus] No scenes found for land ${land.id}`);
        continue;
      }

      // Get best scene (lowest cloud cover)
      const bestScene = scenes.sort((a: any, b: any) => 
        (a.properties['eo:cloud_cover'] || 100) - (b.properties['eo:cloud_cover'] || 100)
      )[0];

      const redBandUrl = bestScene.assets?.B04?.href;
      const nirBandUrl = bestScene.assets?.B08?.href;
      const acquisitionDate = bestScene.properties.datetime;
      const cloudCover = bestScene.properties['eo:cloud_cover'] || 0;

      console.log(`[Copernicus] Best scene for land ${land.id}: ${acquisitionDate}, cloud: ${cloudCover}%`);

      if (params.downloadFiles && redBandUrl && nirBandUrl) {
        // Download COG files
        const redPath = `satellite-bands/copernicus/${land.mgrs_tile_id}/${acquisitionDate}/red_B04.tif`;
        const nirPath = `satellite-bands/copernicus/${land.mgrs_tile_id}/${acquisitionDate}/nir_B08.tif`;

        // Download Red band
        const redResponse = await fetch(redBandUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const redBuffer = await redResponse.arrayBuffer();
        await supabase.storage.from('satellite-bands').upload(redPath, redBuffer, {
          contentType: 'image/tiff',
          upsert: true
        });

        // Download NIR band
        const nirResponse = await fetch(nirBandUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const nirBuffer = await nirResponse.arrayBuffer();
        await supabase.storage.from('satellite-bands').upload(nirPath, nirBuffer, {
          contentType: 'image/tiff',
          upsert: true
        });

        console.log(`[Copernicus] Downloaded bands for land ${land.id}`);

        // Update satellite_tiles record
        await supabase.from('satellite_tiles').upsert({
          tile_id: land.mgrs_tile_id,
          tenant_id: land.tenant_id,
          acquisition_date: acquisitionDate,
          cloud_coverage: cloudCover,
          api_source: 'copernicus_sentinel_hub',
          red_band_path: redPath,
          nir_band_path: nirPath,
          processing_status: 'completed',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tile_id,acquisition_date'
        });
      }

      processed++;
      success++;
      results.push({
        land_id: land.id,
        tile_id: land.mgrs_tile_id,
        acquisition_date: acquisitionDate,
        cloud_coverage: cloudCover
      });

    } catch (error: any) {
      console.error(`[Copernicus] Error processing land ${land.id}:`, error);
      processed++;
    }
  }

  return {
    tiles_processed: processed,
    success_count: success,
    results
  };
}

async function getCopernicusToken(authUrl: string): Promise<string> {
  const clientId = Deno.env.get('COPERNICUS_CLIENT_ID');
  const clientSecret = Deno.env.get('COPERNICUS_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Copernicus credentials not configured. Set COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET');
  }

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    throw new Error(`OAuth token request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}
