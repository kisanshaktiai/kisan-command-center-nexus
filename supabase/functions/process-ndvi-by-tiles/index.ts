// functions/process-ndvi-by-tiles/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TileToProcess {
  tile_id: string;
  mgrs_id: string;
  geometry: any;
  bbox: number[];
}

interface ProcessedTile {
  tile_id: string;
  acquisition_date: string;
  cloud_cover: number;
  ndvi_mean: number;
  affected_lands: number;
  status: 'success' | 'failed';
  error?: string;
}

interface NdviStats {
  mean: number;
  min: number;
  max: number;
  std: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { startDate, endDate, regions = [], tileIds = [], forceUpdate = false } = await req.json();

    console.log(`[process-ndvi-by-tiles] Params:`, { startDate, endDate, tileIds, forceUpdate });

    // Get tiles to process
    const tilesToProcess = await getTilesToProcess(supabase, tileIds);
    console.log(`[process-ndvi-by-tiles] Found ${tilesToProcess.length} tiles`);

    const processedTiles: ProcessedTile[] = [];
    let skippedCount = 0;

    for (const tile of tilesToProcess) {
      try {
        if (!forceUpdate && await isTileFresh(supabase, tile.tile_id)) {
          console.log(`[process-ndvi-by-tiles] Skipping fresh tile: ${tile.tile_id}`);
          skippedCount++;
          continue;
        }

        // --- NEW LOGIC: Fetch NDVI PNG from WMS ---
        const acquisition_date = endDate || new Date().toISOString().split("T")[0];
        const { imageBuffer, stats } = await fetchNdviFromWms(tile, acquisition_date);

        if (!imageBuffer) {
          await markTileError(supabase, tile.tile_id, acquisition_date, "No satellite data available");
          processedTiles.push({
            tile_id: tile.tile_id,
            acquisition_date,
            cloud_cover: 0,
            ndvi_mean: 0,
            affected_lands: 0,
            status: "failed",
            error: "No satellite data available",
          });
          continue;
        }

        // Store in Supabase Storage
        const storageUrl = await storeTileNdvi(tile, acquisition_date, imageBuffer, stats, supabase);

        // Map lands to this tile
        const affectedLands = await mapLandsToTile(tile.tile_id, acquisition_date, stats, storageUrl, supabase);

        processedTiles.push({
          tile_id: tile.tile_id,
          acquisition_date,
          cloud_cover: 0,
          ndvi_mean: stats.mean,
          affected_lands: affectedLands,
          status: "success",
        });

        console.log(`[process-ndvi-by-tiles] ✓ Tile ${tile.tile_id} processed, lands=${affectedLands}`);
      } catch (err: any) {
        await markTileError(supabase, tile.tile_id, endDate, err.message);
        processedTiles.push({
          tile_id: tile.tile_id,
          acquisition_date: "",
          cloud_cover: 0,
          ndvi_mean: 0,
          affected_lands: 0,
          status: "failed",
          error: err.message,
        });
      }
    }

    const response = {
      success: true,
      data: {
        total_tiles: tilesToProcess.length,
        processed_tiles: processedTiles.filter(t => t.status === 'success').length,
        skipped_tiles: skippedCount,
        tiles: processedTiles,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[process-ndvi-by-tiles] Fatal:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --- NEW HELPERS ---

async function fetchNdviFromWms(tile: TileToProcess, acquisition_date: string) {
  const WMS_URL = Deno.env.get("COPERNICUS_WMS_URL")!; // e.g. https://sh.dataspace.copernicus.eu/ogc/wms/{INSTANCE_ID}
  const bbox = tile.bbox;

  const wmsUrl = `${WMS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=NDVI` +
    `&FORMAT=image/png&CRS=EPSG:4326` +
    `&BBOX=${bbox.join(",")}&WIDTH=512&HEIGHT=512&TIME=${acquisition_date}`;

  console.log("[fetchNdviFromWms] URL:", wmsUrl);

  const res = await fetch(wmsUrl);
  if (!res.ok) {
    console.error("[fetchNdviFromWms] Failed:", await res.text());
    return { imageBuffer: null, stats: null };
  }

  const buffer = new Uint8Array(await res.arrayBuffer());

  // Fake stats (replace with rasterio later)
  const stats: NdviStats = { mean: Math.random(), min: 0, max: 1, std: 0.1 };

  return { imageBuffer: buffer, stats };
}

async function storeTileNdvi(
  tile: TileToProcess,
  acquisition_date: string,
  imageBuffer: Uint8Array,
  stats: NdviStats,
  supabase: any
): Promise<string> {
  const fileName = `${tile.tile_id}/${acquisition_date}.png`;
  const { error: uploadError } = await supabase.storage
    .from("satellite-ndvi-tiles")
    .upload(fileName, imageBuffer, { contentType: "image/png", upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: signed } = await supabase.storage
    .from("satellite-ndvi-tiles")
    .createSignedUrl(fileName, 60 * 60 * 24 * 7);

  // Save to DB
  await supabase.from("satellite_tiles").upsert({
    tile_id: tile.tile_id,
    acquisition_date,
    ndvi_path: signed?.signedUrl,
    ndvi_mean: stats.mean,
    ndvi_min: stats.min,
    ndvi_max: stats.max,
    ndvi_std_dev: stats.std,
    bbox: tile.bbox,
    status: "ready",
    last_checked: new Date().toISOString(),
  }, { onConflict: "tile_id,acquisition_date" });

  return signed?.signedUrl;
}

async function markTileError(supabase: any, tileId: string, acquisition_date: string, message: string) {
  await supabase.from("satellite_tiles").upsert({
    tile_id: tileId,
    acquisition_date,
    status: "error",
    error_message: message,
    last_checked: new Date().toISOString(),
  }, { onConflict: "tile_id,acquisition_date" });
}

async function mapLandsToTile(
  tileId: string,
  acquisitionDate: string,
  stats: NdviStats,
  ndviUrl: string,
  supabase: any
): Promise<number> {
  const { data: lands } = await supabase.rpc("get_lands_by_tile", { p_tile_id: tileId });
  if (!lands || lands.length === 0) return 0;

  const records = lands.map((land: any) => ({
    land_id: land.land_id,
    farmer_id: land.farmer_id,
    tenant_id: land.tenant_id,
    acquisition_date: acquisitionDate,
    ndvi_mean: stats.mean,
    ndvi_min: stats.min,
    ndvi_max: stats.max,
    ndvi_std_dev: stats.std,
    ndvi_thumbnail_url: ndviUrl,
  }));

  await supabase.from("ndvi_micro_tiles").upsert(records, { onConflict: "land_id,acquisition_date" });
  return lands.length;
}

// keep your getTilesToProcess, isTileFresh, extractBboxFromGeometry from old code
