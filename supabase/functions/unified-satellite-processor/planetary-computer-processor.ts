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
  
  // Get lands to process
  const { data: lands, error: landsError } = await supabase
    .from('lands')
    .select('id, tenant_id, boundary, mgrs_tile_id')
    .in('mgrs_tile_id', params.tileIds.length > 0 ? params.tileIds : undefined);

  if (landsError) {
    throw new Error(`Failed to fetch lands: ${landsError.message}`);
  }

  console.log(`[MPC] Found ${lands?.length || 0} lands to process`);

  let processed = 0;
  let success = 0;
  const results = [];

  for (const land of lands || []) {
    try {
      if (!land.boundary?.coordinates) {
        console.log(`[MPC] Land ${land.id} has no boundary, skipping`);
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

      console.log(`[MPC] Searching STAC for land ${land.id}, bbox: ${bbox}`);

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

      console.log(`[MPC] Found ${scenes.length} scenes for land ${land.id}`);

      if (scenes.length === 0) {
        console.log(`[MPC] No scenes found for land ${land.id}`);
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

      console.log(`[MPC] Best scene for land ${land.id}: ${acquisitionDate}, cloud: ${cloudCover}%`);

      if (params.downloadFiles && redBandUrl && nirBandUrl) {
        // Download and store band files
        const redPath = `satellite-bands/mpc/${land.mgrs_tile_id}/${acquisitionDate}/red_B04.tif`;
        const nirPath = `satellite-bands/mpc/${land.mgrs_tile_id}/${acquisitionDate}/nir_B08.tif`;

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

        console.log(`[MPC] Downloaded bands for land ${land.id}`);

        // Update satellite_tiles record
        await supabase.from('satellite_tiles').upsert({
          tile_id: land.mgrs_tile_id,
          tenant_id: land.tenant_id,
          acquisition_date: acquisitionDate,
          cloud_coverage: cloudCover,
          api_source: 'planetary_computer',
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
      console.error(`[MPC] Error processing land ${land.id}:`, error);
      processed++;
    }
  }

  return {
    tiles_processed: processed,
    success_count: success,
    results
  };
}
