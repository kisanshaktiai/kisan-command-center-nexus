// Microsoft Planetary Computer processor
// Uses existing working logic from fetch-s2-ndvi

export async function processPlanetaryComputer(supabase: any, params: {
  startDate: string;
  endDate: string;
  cloudCoverage: number;
  regions: string[];
  landIds: string[];
  tileIds: string[];
  downloadFiles: boolean;
  forceRefresh: boolean;
}) {
  console.log('[MPC] Processing with Microsoft Planetary Computer');

  const STAC_API_URL = 'https://planetarycomputer.microsoft.com/api/stac/v1';
  
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

  console.log(`[MPC] Found ${tiles?.length || 0} tiles to process`);

  let processed = 0;
  let success = 0;
  const results = [];

  for (const tile of tiles || []) {
    try {
      if (!tile.geometry) {
        console.log(`[MPC] Tile ${tile.tile_id} has no geometry, skipping`);
        continue;
      }

      // Convert PostGIS geometry to bbox using our helper function
      const { data: bboxArray, error: bboxError } = await supabase
        .rpc('get_geometry_bbox', { geom: tile.geometry });
      
      if (bboxError || !bboxArray || bboxArray.length !== 4) {
        console.log(`[MPC] Failed to get bbox for tile ${tile.tile_id}:`, bboxError);
        continue;
      }

      const bbox = bboxArray.map((val: string) => parseFloat(val));

      console.log(`[MPC] Searching STAC for tile ${tile.tile_id}, bbox: ${bbox}`);

      // Search STAC catalog
      const searchResponse = await fetch(`${STAC_API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collections: ['sentinel-2-l2a'],
          bbox: bbox,
          datetime: `${params.startDate}T00:00:00Z/${params.endDate}T23:59:59Z`,
          query: {
            'eo:cloud_cover': { 'lt': params.cloudCoverage }
          },
          limit: 5
        })
      });

      if (!searchResponse.ok) {
        throw new Error(`STAC search failed: ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      const scenes = searchData.features || [];

      console.log(`[MPC] Found ${scenes.length} scenes for tile ${tile.tile_id}`);

      if (scenes.length === 0) {
        console.log(`[MPC] No scenes found for tile ${tile.tile_id}`);
        continue;
      }

      // Get best scene (lowest cloud cover)
      const bestScene = scenes.sort((a: any, b: any) => 
        (a.properties['eo:cloud_cover'] || 100) - (b.properties['eo:cloud_cover'] || 100)
      )[0];

      const redBandUrl = bestScene.assets.B04?.href;
      const nirBandUrl = bestScene.assets.B08?.href;
      const acquisitionDate = bestScene.properties.datetime;
      const cloudCover = bestScene.properties['eo:cloud_cover'] || 0;

      console.log(`[MPC] Best scene for tile ${tile.tile_id}: ${acquisitionDate}, cloud: ${cloudCover}%`);

      if (params.downloadFiles && redBandUrl && nirBandUrl) {
        // Download and store band files
        const redPath = `satellite-bands/mpc/${tile.tile_id}/${acquisitionDate}/red_B04.tif`;
        const nirPath = `satellite-bands/mpc/${tile.tile_id}/${acquisitionDate}/nir_B08.tif`;

        // Download Red band
        const redResponse = await fetch(redBandUrl);
        const redBuffer = await redResponse.arrayBuffer();
        await supabase.storage.from('satellite-bands').upload(redPath, redBuffer, {
          contentType: 'image/tiff',
          upsert: true
        });

        // Download NIR band
        const nirResponse = await fetch(nirBandUrl);
        const nirBuffer = await nirResponse.arrayBuffer();
        await supabase.storage.from('satellite-bands').upload(nirPath, nirBuffer, {
          contentType: 'image/tiff',
          upsert: true
        });

        console.log(`[MPC] Downloaded bands for tile ${tile.tile_id}`);

        // Update satellite_tiles record
        const { error: upsertError } = await supabase.from('satellite_tiles').upsert({
          tile_id: tile.tile_id,
          acquisition_date: acquisitionDate.split('T')[0], // Convert to date format
          cloud_cover: cloudCover,
          data_source: 'planetary_computer',
          red_band_path: redPath,
          nir_band_path: nirPath,
          status: 'completed',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tile_id,acquisition_date'
        });

        if (upsertError) {
          console.error(`[MPC] Error upserting satellite_tiles:`, upsertError);
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
      console.error(`[MPC] Error processing tile ${tile.tile_id}:`, error);
      processed++;
    }
  }

  return {
    tiles_processed: processed,
    success_count: success,
    results
  };
}
