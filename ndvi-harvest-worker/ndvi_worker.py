import os
import tempfile
import asyncio
from datetime import datetime, date, timezone, timedelta

import numpy as np
import rasterio
import planetary_computer as pc
from pystac_client import Client
from supabase import create_client, Client as SupaClient
from httpx import Timeout, AsyncClient, HTTPError
from tenacity import retry, stop_after_attempt, wait_exponential

# ========= Config =========
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET = os.getenv("STORAGE_BUCKET", "satellite-tiles")
COUNTRY_CODE = os.getenv("SUPABASE_COUNTRY_CODE", "IND")
CLOUD_COVER = float(os.getenv("CLOUD_COVER_THRESHOLD", "20"))
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT_TILES", "5"))
START_DATE = os.getenv("START_DATE", "2023-01-01")
UPDATE_WINDOW_DAYS = int(os.getenv("UPDATE_WINDOW_DAYS", "30"))   # look-back window
MIN_UPDATE_DAYS = int(os.getenv("MIN_UPDATE_DAYS", "5"))          # don’t refresh if newer than this
MAX_ITEMS = int(os.getenv("MAX_STAC_ITEMS", "50"))                # bound the listing
DRY_RUN = os.getenv("DRY_RUN", "false").lower() == "true"

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

supabase: SupaClient = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
supabase.storage._client.timeout = Timeout(300.0)  # generous for large TIFFs
http_client = AsyncClient(timeout=Timeout(300.0))


def log(s: str):
    print(s, flush=True)


# ========= DB helpers =========
def get_country_id() -> str:
    res = supabase.table("countries").select("id").eq("code", COUNTRY_CODE).limit(1).execute()
    if not res.data:
        raise RuntimeError(f"❌ Country code not found: {COUNTRY_CODE}")
    cid = res.data[0]["id"]
    log(f"🌏 Country={COUNTRY_CODE} id={cid}")
    return cid


def get_mgrs_tiles(country_id: str, limit=50):
    # Prefer RPC ordering (oldest first) so we progress through the backlog deterministically
    try:
        res = supabase.rpc("get_tiles_for_processing", {"p_country_id": country_id, "p_limit": limit}).execute()
        if res.data:
            log(f"🧩 RPC returned {len(res.data)} tiles")
            return res.data
    except Exception as e:
        log(f"⚠️ RPC failed, fallback to direct query: {e}")

    res = (
        supabase.table("mgrs_tiles")
        .select("tile_id,country_id,updated_at,created_at")
        .eq("country_id", country_id)
        .order("updated_at", desc=False)
        .limit(limit)
        .execute()
    )
    tiles = res.data or []
    log(f"🧩 Direct query returned {len(tiles)} tiles")
    return tiles


def get_last_completed_date(tile_id: str, country_id: str) -> date | None:
    res = (
        supabase.table("satellite_tiles")
        .select("acquisition_date,status")
        .eq("tile_id", tile_id)
        .eq("country_id", country_id)
        .eq("status", "completed")
        .order("acquisition_date", desc=True)
        .limit(1)
        .execute()
    )
    if res.data:
        d = date.fromisoformat(res.data[0]["acquisition_date"])
        log(f"   📌 Last completed {tile_id} → {d}")
        return d
    log(f"   📌 {tile_id} has no completed rows yet")
    return None


def record_exists(tile_id: str, country_id: str, day: str) -> bool:
    res = (
        supabase.table("satellite_tiles")
        .select("id")
        .eq("tile_id", tile_id)
        .eq("country_id", country_id)
        .eq("acquisition_date", day)
        .eq("collection", "sentinel-2-l2a")
        .limit(1)
        .execute()
    )
    exists = bool(res.data)
    if exists:
        log(f"   ⏭️ {tile_id} @ {day} already exists")
    return exists


# ========= NDVI =========
def compute_ndvi(red_path: str, nir_path: str, out_path: str):
    with rasterio.open(red_path) as r, rasterio.open(nir_path) as n:
        red = r.read(1).astype("float32")
        nir = n.read(1).astype("float32")

        # valid range for S2 L2A scaled reflectance
        valid = (red > 0) & (red < 10000) & (nir > 0) & (nir < 10000)
        ndvi = np.full(red.shape, np.nan, dtype="float32")
        denom = nir + red
        ok = valid & (denom > 0)
        if np.any(ok):
            ndvi[ok] = (nir[ok] - red[ok]) / denom[ok]
        ndvi = np.clip(ndvi, -1, 1)

        # quick stats
        pct_valid = float(np.count_nonzero(~np.isnan(ndvi))) * 100.0 / ndvi.size
        mean_ndvi = float(np.nanmean(ndvi)) if np.count_nonzero(~np.isnan(ndvi)) else float("nan")
        log(f"   📊 NDVI: {pct_valid:.1f}% valid, mean={mean_ndvi:.3f}")

        profile = r.profile
        profile.update(dtype="float32", count=1, nodata=np.nan, compress="lzw")

        with rasterio.open(out_path, "w", **profile) as dst:
            dst.write(ndvi, 1)


# ========= IO with retries =========
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=5, max=60))
async def download(url: str, to_path: str):
    resp = await http_client.get(url)
    resp.raise_for_status()
    with open(to_path, "wb") as f:
        f.write(resp.content)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=5, max=60))
def upload_and_upsert(tile_id: str, country_id: str, day: str, ndvi_path: str, red_url: str, nir_url: str, scene):
    storage_path = f"{tile_id}/{day}/ndvi.tif"

    # Upload
    with open(ndvi_path, "rb") as f:
        up = supabase.storage.from_(BUCKET).upload(storage_path, f, {"content-type": "image/tiff", "upsert": "true"})
        if getattr(up, "error", None):
            raise RuntimeError(f"storage.upload error: {up.error}")

    # Upsert row
    payload = {
        "tile_id": tile_id,
        "country_id": country_id,
        "acquisition_date": day,
        "collection": "sentinel-2-l2a",
        "cloud_cover": scene.properties.get("eo:cloud_cover"),
        "ndvi_path": storage_path,
        "red_band_path": scene.assets["B04"].href,
        "nir_band_path": scene.assets["B08"].href,
        "metadata": scene.to_dict(),
        "processing_level": "L2A",
        "status": "completed",
    }

    res = supabase.table("satellite_tiles").upsert(
        payload, on_conflict=["tile_id", "acquisition_date", "collection"]
    ).execute()

    if getattr(res, "error", None):
        raise RuntimeError(f"db.upsert error: {res.error}")

    log(f"   💾 DB row upserted. storage={storage_path}")


# ========= Tile processing =========
async def process_tile(tile, stac: Client, sem: asyncio.Semaphore):
    tile_id = tile["tile_id"]
    country_id = tile.get("country_id")
    async with sem:
        try:
            log(f"\n🧱 Tile {tile_id} start")

            last = get_last_completed_date(tile_id, country_id)
            now_utc = datetime.now(timezone.utc)

            # Decide search window
            if last:
                age = (now_utc.date() - last).days
                log(f"   ⌛ last={last}, age={age} days")
                if age < MIN_UPDATE_DAYS:
                    log(f"   ✅ fresh (<{MIN_UPDATE_DAYS}d), skip")
                    return
                since = max(last, (now_utc.date() - timedelta(days=UPDATE_WINDOW_DAYS)))
            else:
                since = date.fromisoformat(START_DATE)
                log(f"   🆕 first run → since={since}")

            window = f"{since.isoformat()}/{now_utc.isoformat()}"
            log(f"   🔎 STAC search window={window}, cc<{CLOUD_COVER}")

            search = stac.search(
                collections=["sentinel-2-l2a"],
                query={"s2:mgrs_tile": {"eq": tile_id}, "eo:cloud_cover": {"lt": CLOUD_COVER}},
                datetime=window,
                max_items=MAX_ITEMS,
            )

            # Important: pull concrete items
            items = list(search.get_items())
            if not items:
                log(f"   ❌ no items")
                return

            # Sort: newest first, then by cloud (ascending)
            def _when(it):
                dt = it.datetime or datetime.fromisoformat(it.properties["datetime"].replace("Z", "+00:00"))
                return dt

            items.sort(key=lambda it: (_when(it), -float("inf")), reverse=True)  # newest first
            # Now stable-sort by cloud cover ascending but keep recency priority
            items.sort(key=lambda it: (it.properties.get("eo:cloud_cover", 9999)))

            picked = items[0]
            picked_dt = _when(picked)
            day = picked_dt.date().isoformat()
            cc = picked.properties.get("eo:cloud_cover", None)
            log(f"   🎯 picked {picked.id} day={day} cloud={cc}")

            # Guard against duplicate
            if record_exists(tile_id, country_id, day):
                return

            # URLs
            red_url = pc.sign(picked.assets["B04"].href)
            nir_url = pc.sign(picked.assets["B08"].href)

            if DRY_RUN:
                log("   🔎 DRY_RUN enabled → skip download/compute/upload")
                return

            with tempfile.TemporaryDirectory() as tmp:
                red = os.path.join(tmp, "B04.tif")
                nir = os.path.join(tmp, "B08.tif")
                out = os.path.join(tmp, "ndvi.tif")

                log("   ⬇️ downloading bands…")
                await download(red_url, red)
                await download(nir_url, nir)

                log("   🧮 computing NDVI…")
                compute_ndvi(red, nir, out)

                log("   ⬆️ uploading & upserting…")
                upload_and_upsert(tile_id, country_id, day, out, red_url, nir_url, picked)

            log(f"   ✅ done {tile_id} @ {day}")

        except HTTPError as e:
            log(f"   🔥 HTTPError {e.request.method} {e.request.url} → {e.response.status_code}")
        except Exception as e:
            log(f"   💥 {type(e).__name__}: {e}")


# ========= Main =========
async def run_async():
    log("=" * 70)
    log("🛰  NDVI – MPC → Supabase")
    log(f"BUCKET={BUCKET}  COUNTRY={COUNTRY_CODE}  CLOUD<{CLOUD_COVER}%")
    log(f"START_DATE={START_DATE}  WINDOW={UPDATE_WINDOW_DAYS}d  MIN_UPDATE={MIN_UPDATE_DAYS}d  MAX_ITEMS={MAX_ITEMS}")
    log("=" * 70)

    cid = get_country_id()
    tiles = get_mgrs_tiles(cid, limit=50)
    if not tiles:
        log("⚠️ no tiles to process")
        return

    stac = Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")
    sem = asyncio.Semaphore(MAX_CONCURRENT)
    await asyncio.gather(*[process_tile(t, stac, sem) for t in tiles])

    await http_client.aclose()
    log("\n✅ All tiles processed")


def run():
    asyncio.run(run_async())


if __name__ == "__main__":
    run()
