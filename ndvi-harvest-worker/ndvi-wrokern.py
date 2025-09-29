import os
import tempfile
import asyncio
from datetime import datetime, date, timezone, timedelta
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
START_DATE = os.getenv("START_DATE", "2020-01-01")  # Configurable start date
UPDATE_WINDOW_DAYS = int(os.getenv("UPDATE_WINDOW_DAYS", "30"))  # Look back period
MIN_UPDATE_DAYS = int(os.getenv("MIN_UPDATE_DAYS", "7"))  # Don't update if fresher than this

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("❌ Supabase URL or Service key missing.")

supabase: SupaClient = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
supabase.storage._client.timeout = Timeout(300.0)  # 5 minutes

http_client = AsyncClient(timeout=Timeout(300.0))  # for band downloads

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def get_country_id():
    """Get country ID from database."""
    res = (
        supabase.table("countries")
        .select("id")
        .eq("code", COUNTRY_CODE)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise RuntimeError(f"❌ Country code not found: {COUNTRY_CODE}")
    
    country_id = res.data[0]["id"]
    print(f"✅ Country resolved: {COUNTRY_CODE} (ID: {country_id})")
    return country_id


def get_mgrs_tiles(country_id, limit=50):
    """Get MGRS tiles for processing."""
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
    """
    Get the last successfully processed date for this tile.
    Returns None if never processed, or the last acquisition date.
    """
    res = (
        supabase.table("satellite_tiles")
        .select("acquisition_date")
        .eq("tile_id", tile_id)
        .eq("country_id", country_id)
        .eq("status", "completed")  # Only count successful processing
        .order("acquisition_date", desc=True)
        .limit(1)
        .execute()
    )
    if res.data:
        last = date.fromisoformat(res.data[0]["acquisition_date"])
        print(f"ℹ️ {tile_id}: Last processed date is {last}")
        return last
    
    print(f"ℹ️ {tile_id}: Never processed before")
    return None


def check_scene_exists(tile_id, country_id, acquisition_date):
    """
    Check if a scene for this specific date already exists.
    Prevents duplicate processing.
    """
    res = (
        supabase.table("satellite_tiles")
        .select("id")
        .eq("tile_id", tile_id)
        .eq("country_id", country_id)
        .eq("acquisition_date", acquisition_date)
        .eq("collection", "sentinel-2-l2a")
        .limit(1)
        .execute()
    )
    
    exists = len(res.data) > 0
    if exists:
        print(f"⏭️ {tile_id} on {acquisition_date}: Already exists, skipping")
    return exists


def compute_ndvi(red_path, nir_path, out_path):
    """
    Compute NDVI with improved masking for invalid pixels.
    Handles clouds, water, and no-data values properly.
    """
    with rasterio.open(red_path) as r, rasterio.open(nir_path) as n:
        red = r.read(1).astype("float32")
        nir = n.read(1).astype("float32")
        
        # Sentinel-2 L2A valid range: 0-10000 (surface reflectance)
        valid_mask = (red > 0) & (red < 10000) & (nir > 0) & (nir < 10000)
        
        # Initialize with NaN for invalid pixels
        ndvi = np.full(red.shape, np.nan, dtype="float32")
        
        # Compute NDVI only for valid pixels
        denominator = nir + red
        valid_computation = valid_mask & (denominator > 0)
        
        if np.any(valid_computation):
            ndvi[valid_computation] = (
                (nir[valid_computation] - red[valid_computation]) / 
                denominator[valid_computation]
            )
            # Clip to valid NDVI range
            ndvi = np.clip(ndvi, -1, 1)
        
        # Calculate statistics for logging
        valid_pixels = np.sum(~np.isnan(ndvi))
        total_pixels = ndvi.size
        coverage = 100 * valid_pixels / total_pixels if total_pixels > 0 else 0
        mean_ndvi = np.nanmean(ndvi) if valid_pixels > 0 else np.nan
        
        print(f"   📊 NDVI stats: {coverage:.1f}% valid pixels, mean={mean_ndvi:.3f}")
        
        profile = r.profile
        profile.update(
            dtype="float32",
            count=1,
            nodata=np.nan,
            compress="lzw"  # Add compression to save storage
        )

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

    # Upload file to storage
    with open(ndvi_path, "rb") as f:
        resp = supabase.storage.from_(BUCKET).upload(
            storage_path, f,
            {"content-type": "image/tiff", "upsert": "true"}
        )
        if hasattr(resp, "error") and resp.error:
            raise RuntimeError(f"❌ Upload failed for {storage_path}: {resp.error}")

    # Prepare database record
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

    # Upsert to database
    supabase.table("satellite_tiles").upsert(
        payload, on_conflict=["tile_id", "acquisition_date", "collection"]
    ).execute()
    
    print(f"   💾 Saved to database and storage: {storage_path}")


# ----------------------------------------------------------------------
# Async Tile Processor - FIXED VERSION
# ----------------------------------------------------------------------
async def process_tile(tile, stac, semaphore):
    """
    Process a tile to get the LATEST best-quality scene.
    
    Strategy: Look at the last UPDATE_WINDOW_DAYS days and pick the best
    quality scene. Only update if existing data is older than MIN_UPDATE_DAYS.
    
    This ensures:
    - Farmers see recent, clear imagery
    - No duplicate processing
    - Automatic updates when new data is available
    """
    tile_id = tile["tile_id"]
    country_id = tile.get("country_id")

    async with semaphore:
        try:
            print(f"\n🔄 Processing {tile_id}...")
            
            # Check last processed date
            last_date = get_last_date(tile_id, country_id)
            
            # Calculate search window
            end_date = datetime.now(timezone.utc)
            
            # If we have recent data, check if update is needed
            if last_date:
                days_old = (end_date.date() - last_date).days
                print(f"   📅 Existing data is {days_old} days old")
                
                # Skip if data is fresh enough
                if days_old < MIN_UPDATE_DAYS:
                    print(f"   ✅ {tile_id}: Data is fresh, skipping update")
                    return
            
            # Search in the last UPDATE_WINDOW_DAYS
            since_date = (end_date - timedelta(days=UPDATE_WINDOW_DAYS)).date()
            
            # But if this is first time processing, use configured start date
            if last_date is None:
                since_date = date.fromisoformat(START_DATE)
                print(f"   🆕 First time processing, searching from {since_date}")
            else:
                print(f"   🔍 Searching for best scene in last {UPDATE_WINDOW_DAYS} days")
            
            # Search STAC catalog
            search = stac.search(
                collections=["sentinel-2-l2a"],
                query={
                    "s2:mgrs_tile": {"eq": tile_id},
                    "eo:cloud_cover": {"lt": CLOUD_COVER},
                },
                datetime=f"{since_date.isoformat()}/{end_date.isoformat()}",
            )

            # Get search results
            items = list(search.items())
            if not items:
                print(f"   ❌ {tile_id}: No scenes found with <{CLOUD_COVER}% cloud cover")
                return

            print(f"   📊 Found {len(items)} candidate scenes")

            # Sort by cloud cover (best quality first), then by date (most recent first)
            items.sort(
                key=lambda x: (
                    x.properties.get("eo:cloud_cover", 1000),
                    -(x.datetime or datetime.fromisoformat(
                        x.properties["datetime"].replace("Z", "+00:00")
                    )).timestamp()
                )
            )
            
            # Select best scene
            scene = items[0]
            scene_dt = scene.datetime or datetime.fromisoformat(
                scene.properties["datetime"].replace("Z", "+00:00")
            )
            date_str = scene_dt.date().isoformat()
            cloud_cover = scene.properties.get("eo:cloud_cover")
            
            print(f"   🎯 Selected scene: {date_str} (cloud cover: {cloud_cover:.1f}%)")

            # Check if this exact scene already exists
            if check_scene_exists(tile_id, country_id, date_str):
                return

            # Sign URLs for downloading
            red_url = pc.sign(scene.assets["B04"].href)
            nir_url = pc.sign(scene.assets["B08"].href)

            # Process in temporary directory
            with tempfile.TemporaryDirectory() as tmp:
                red = os.path.join(tmp, "red.tif")
                nir = os.path.join(tmp, "nir.tif")
                ndvi = os.path.join(tmp, "ndvi.tif")

                print(f"   ⬇️ Downloading bands...")
                await download_file(red_url, red)
                await download_file(nir_url, nir)

                print(f"   🧮 Computing NDVI...")
                compute_ndvi(red, nir, ndvi)
                
                print(f"   ⬆️ Uploading to storage...")
                upload_record(tile_id, country_id, date_str, ndvi, red_url, nir_url, scene)

            print(f"   ✅ {tile_id}: Successfully processed {date_str}")

        except Exception as e:
            print(f"   💥 {tile_id}: Error - {type(e).__name__}: {e}")
            # Don't raise - let other tiles continue processing


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
async def run_async():
    """Main async execution."""
    print("=" * 70)
    print("🛰️  SATELLITE TILE PROCESSOR - FETCHING LATEST DATA FROM MPC")
    print("=" * 70)
    print(f"📍 Country: {COUNTRY_CODE}")
    print(f"☁️ Cloud cover threshold: {CLOUD_COVER}%")
    print(f"📅 Update window: {UPDATE_WINDOW_DAYS} days")
    print(f"⏱️ Min update interval: {MIN_UPDATE_DAYS} days")
    print(f"🔢 Max concurrent: {MAX_CONCURRENT}")
    print("=" * 70)
    
    try:
        # Get country and tiles
        country_id = get_country_id()
        tiles = get_mgrs_tiles(country_id, limit=50)
        
        if not tiles:
            print("⚠️ No tiles found for processing.")
            return

        print(f"\n📋 Processing {len(tiles)} tiles...\n")

        # Open STAC client
        stac = Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
        semaphore = asyncio.Semaphore(MAX_CONCURRENT)

        # Process all tiles concurrently
        tasks = [process_tile(t, stac, semaphore) for t in tiles]
        await asyncio.gather(*tasks)

        print("\n" + "=" * 70)
        print("✅ Processing complete!")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        raise
    finally:
        # Cleanup
        await http_client.aclose()
        print("\n🔒 Resources cleaned up")


def run():
    """Entry point."""
    asyncio.run(run_async())


if __name__ == "__main__":
    run()
