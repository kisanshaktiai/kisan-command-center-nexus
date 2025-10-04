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
  
  // Get MGRS tiles to process
  let query = supabase
    .from('mgrs_tiles')
    .select('id, tile_id, geometry');
  
  if (params.tileIds.length > 0) {
    query = query.in('tile_id', params.tileIds);
  } else {
    query = query.eq('is_agri', true);
  }
  
  const { data: tiles, error: tilesError } = await query;

  if (tilesError) {
    throw new Error(`Failed to fetch tiles: ${tilesError.message}`);
  }

  console.log(`[Copernicus] Found ${tiles?.length || 0} tiles to process`);

  let processed = 0;
  let success = 0;
  const results = [];

  for (const tile of tiles || []) {
    try {
      if (!tile.geometry) {
        console.log(`[Copernicus] Tile ${tile.tile_id} has no geometry, skipping`);
        continue;
      }

      // Convert PostGIS geometry to bbox
      const { data: bboxArray, error: bboxError } = await supabase
        .rpc('get_geometry_bbox', { geom: tile.geometry });
      
      if (bboxError || !bboxArray || bboxArray.length !== 4) {
        console.log(`[Copernicus] Failed to get bbox for tile ${tile.tile_id}:`, bboxError);
        continue;
      }

      const bbox = bboxArray.map((val: string) => parseFloat(val));

      console.log(`[Copernicus] Searching catalog for tile ${tile.tile_id}, bbox: ${bbox}`);

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

      console.log(`[Copernicus] Found ${scenes.length} scenes for tile ${tile.tile_id}`);

      if (scenes.length === 0) {
        console.log(`[Copernicus] No scenes found for tile ${tile.tile_id}`);
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

      console.log(`[Copernicus] Best scene for tile ${tile.tile_id}: ${acquisitionDate}, cloud: ${cloudCover}%`);

      if (params.downloadFiles && redBandUrl && nirBandUrl) {
        // Download COG files
        const redPath = `satellite-bands/copernicus/${tile.tile_id}/${acquisitionDate}/red_B04.tif`;
        const nirPath = `satellite-bands/copernicus/${tile.tile_id}/${acquisitionDate}/nir_B08.tif`;

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

        console.log(`[Copernicus] Downloaded bands for tile ${tile.tile_id}`);

        // Update satellite_tiles record with api_source (not data_source)
        const { error: upsertError } = await supabase.from('satellite_tiles').upsert({
          tile_id: tile.tile_id,
          acquisition_date: acquisitionDate.split('T')[0],
          cloud_cover: cloudCover,
          api_source: 'copernicus_sentinel_hub', // Matches migration column name
          red_band_path: redPath,
          nir_band_path: nirPath,
          status: 'completed',
          collection: 'SENTINEL-2',
          processing_level: 'L2A',
          country_id: 'IN',
          copernicus_red_band_url: redBandUrl,
          copernicus_nir_band_url: nirBandUrl,
          copernicus_download_attempted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tile_id,acquisition_date'
        });

        if (upsertError) {
          console.error(`[Copernicus] Error upserting satellite_tiles:`, upsertError);
        }
      }

      processed++;
      success++;
      results.push({
        tile_id: tile.tile_id,
        acquisition_date: acquisitionDate,
        cloud_coverage: cloudCover
      });

    } catch (error: any) {
      console.error(`[Copernicus] Error processing tile ${tile.tile_id}:`, error);
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
