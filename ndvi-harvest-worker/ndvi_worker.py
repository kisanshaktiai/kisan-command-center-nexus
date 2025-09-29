import os
import tempfile
import asyncio
from datetime import datetime, date, timezone
import numpy as np
import rasterio
import planetary_computer as pc
from pystac_client import Client
from supabase import create_client, Client as SupaClient
from httpx import Timeout, AsyncClient
from tenacity import retry, stop_after_attempt, wait_exponential

# ----------------------------------------------------------------------
# Environment
# ----------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

BUCKET = os.getenv("STORAGE_BUCKET", "satellite-tiles")
COUNTRY_CODE = os.getenv("SUPABASE_COUNTRY_CODE", "IND")
CLOUD_COVER = float(os.getenv("CLOUD_COVER_THRESHOLD", "20"))
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT_TILES", "5"))

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("❌ Supabase URL or Service key missing.")

supabase: SupaClient = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
supabase.storage._client.timeout = Timeout(300.0)  # 5 minutes

http_client = AsyncClient(timeout=Timeout(300.0))  # for band downloads

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def get_country_id():
    res = (
        supabase.table("countries")
        .select("id")
        .eq("code", COUNTRY_CODE)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise RuntimeError(f"❌ Country code not found: {COUNTRY_CODE}")
    return res.data[0]["id"]


def get_mgrs_tiles(country_id, limit=50):
    try:
        res = supabase.rpc(
            "get_tiles_for_processing",
            {"p_country_id": country_id, "p_limit": limit}
        ).execute()
        if res.data:
            print(f"✅ RPC returned {len(res.data)} tiles")
            return res.data
    except Exception as e:
        print(f"⚠️ RPC failed, falling back to direct query: {e}")

    res = (
        supabase.table("mgrs_tiles")
        .select("tile_id, country_id")
        .eq("country_id", country_id)
        .limit(limit)
        .execute()
    )
    print(f"✅ Direct query returned {len(res.data or [])} tiles")
    return res.data or []


def get_last_date(tile_id, country_id):
    res = (
        supabase.table("satellite_tiles")
        .select("acquisition_date")
        .eq("tile_id", tile_id)
        .eq("country_id", country_id)
        .order("acquisition_date", desc=True)
        .limit(1)
        .execute()
    )
    if res.data:
        return date.fromisoformat(res.data[0]["acquisition_date"])
    return date(2020, 1, 1)


def compute_ndvi(red_path, nir_path, out_path):
    with rasterio.open(red_path) as r, rasterio.open(nir_path) as n:
        red = r.read(1).astype("float32")
        nir = n.read(1).astype("float32")
        ndvi = (nir - red) / (nir + red + 1e-6)

        profile = r.profile
        profile.update(dtype="float32", count=1)

        with rasterio.open(out_path, "w", **profile) as dst:
            dst.write(ndvi, 1)


# ----------------------------------------------------------------------
# Retryable Network Ops
# ----------------------------------------------------------------------
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=5, max=60))
async def download_file(url: str, path: str):
    """Download a file with retries and backoff."""
    r = await http_client.get(url)
    r.raise_for_status()
    with open(path, "wb") as f:
        f.write(r.content)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=5, max=60))
def upload_record(tile_id, country_id, date_str, ndvi_path, red_url, nir_url, scene):
    """Upload NDVI GeoTIFF + upsert record with retries."""
    storage_path = f"{tile_id}/{date_str}/ndvi.tif"

    with open(ndvi_path, "rb") as f:
        resp = supabase.storage.from_(BUCKET).upload(
            storage_path, f,
            {"content-type": "image/tiff", "upsert": "true"}
        )
        if hasattr(resp, "error") and resp.error:
            raise RuntimeError(f"❌ Upload failed for {tile_id}: {resp.error}")

    payload = {
        "tile_id": tile_id,
        "country_id": country_id,
        "acquisition_date": date_str,
        "collection": "sentinel-2-l2a",
        "cloud_cover": scene.properties.get("eo:cloud_cover"),
        "ndvi_path": storage_path,
        "red_band_path": scene.assets["B04"].href,
        "nir_band_path": scene.assets["B08"].href,
        "metadata": scene.to_dict(),
        "status": "completed",
        "processing_level": "L2A",
    }

    supabase.table("satellite_tiles").upsert(
        payload, on_conflict=["tile_id", "acquisition_date", "collection"]
    ).execute()


# ----------------------------------------------------------------------
# Async Tile Processor
# ----------------------------------------------------------------------
async def process_tile(tile, stac, semaphore):
    tile_id = tile["tile_id"]
    country_id = tile.get("country_id")

    async with semaphore:
        try:
            since_date = get_last_date(tile_id, country_id)
            end_date = datetime.now(timezone.utc).isoformat()

            search = stac.search(
                collections=["sentinel-2-l2a"],
                query={
                    "s2:mgrs_tile": {"eq": tile_id},
                    "eo:cloud_cover": {"lt": CLOUD_COVER},
                },
                datetime=f"{since_date.isoformat()}/{end_date}",
            )

            items = list(search.items())
            if not items:
                print(f"❌ No new scenes for {tile_id}")
                return

            items.sort(key=lambda x: x.properties.get("eo:cloud_cover", 1000))
            scene = items[0]

            scene_dt = scene.datetime or datetime.fromisoformat(
                scene.properties["datetime"].replace("Z", "+00:00")
            )
            date_str = scene_dt.date().isoformat()

            red_url = pc.sign(scene.assets["B04"].href)
            nir_url = pc.sign(scene.assets["B08"].href)

            with tempfile.TemporaryDirectory() as tmp:
                red = os.path.join(tmp, "red.tif")
                nir = os.path.join(tmp, "nir.tif")
                ndvi = os.path.join(tmp, "ndvi.tif")

                await download_file(red_url, red)
                await download_file(nir_url, nir)

                compute_ndvi(red, nir, ndvi)
                upload_record(tile_id, country_id, date_str, ndvi, red_url, nir_url, scene)

            print(f"✅ Stored NDVI for {tile_id} on {date_str}")

        except Exception as e:
            print(f"💥 Error processing {tile_id}: {e}")


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
async def run_async():
    country_id = get_country_id()
    tiles = get_mgrs_tiles(country_id, limit=50)
    if not tiles:
        print("⚠️ No tiles found for processing.")
        return

    stac = Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    tasks = [process_tile(t, stac, semaphore) for t in tiles]
    await asyncio.gather(*tasks)


def run():
    asyncio.run(run_async())


if __name__ == "__main__":
    run()
