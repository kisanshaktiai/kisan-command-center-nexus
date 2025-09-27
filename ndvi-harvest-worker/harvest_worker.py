#!/usr/bin/env python3
"""
NDVI Harvest Worker (Centralized for SaaS Admin)

Fetches Sentinel-2 data from Microsoft Planetary Computer (MPC),
computes NDVI composites, and stores results in Supabase shared tables.
"""

import os
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional

import numpy as np
import rasterio
from rasterio.io import MemoryFile
import pystac_client
import planetary_computer
from supabase import create_client, Client
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
import click

# ----------------------------------------------------------------------
# Logging setup
# ----------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("NDVIHarvestWorker")

# ----------------------------------------------------------------------
# Environment config
# ----------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "satellite-tiles")
SUPABASE_COUNTRY_CODE = os.getenv("SUPABASE_COUNTRY_CODE", "IND")  # default = IND

MPC_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
CLOUD_COVER_THRESHOLD = float(os.getenv("CLOUD_COVER_THRESHOLD", "20"))
MAX_TILES_PER_RUN = int(os.getenv("MAX_TILES_PER_RUN", "10"))
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "30"))


# ----------------------------------------------------------------------
# Worker class
# ----------------------------------------------------------------------
class NDVIHarvestWorker:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.catalog = pystac_client.Client.open(
            MPC_STAC_URL, modifier=planetary_computer.sign_inplace
        )
        self.http_client = httpx.AsyncClient(timeout=300.0)
        self._country_id: Optional[str] = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()

    # ------------------------------------------------------------------
    # Country ID cache
    # ------------------------------------------------------------------
    def get_country_id(self) -> str:
        if self._country_id is None:
            resp = self.supabase.table("countries").select("id").eq("code", SUPABASE_COUNTRY_CODE).limit(1).execute()
            if not resp.data:
                raise RuntimeError(f"No country found for code={SUPABASE_COUNTRY_CODE}")
            self._country_id = resp.data[0]["id"]
            logger.info(f"Resolved country_id={self._country_id} for code={SUPABASE_COUNTRY_CODE}")
        return self._country_id

    # ------------------------------------------------------------------
    # Fetch available Sentinel-2 scenes for a tile
    # ------------------------------------------------------------------
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=4, max=60))
    async def fetch_tile_scenes(self, tile_id: str, days_back: int = 7) -> List[Dict]:
        """Try 7d, 14d, 30d windows until we find at least one scene."""
        end_date = datetime.utcnow()
        for window in (days_back, 14, 30):
            start_date = end_date - timedelta(days=window)
            search = self.catalog.search(
                collections=["sentinel-2-l2a"],
                datetime=f"{start_date.isoformat()}Z/{end_date.isoformat()}Z",
                query={"s2:mgrs_tile": {"eq": tile_id}, "eo:cloud_cover": {"lt": CLOUD_COVER_THRESHOLD}},
                sortby=[{"field": "properties.eo:cloud_cover", "direction": "asc"}],
                max_items=10,
            )
            scenes = []
            for item in search.items():
                scenes.append({
                    "id": item.id,
                    "datetime": item.datetime.isoformat(),
                    "cloud_cover": item.properties.get("eo:cloud_cover", 0),
                    "tile_id": item.properties.get("s2:mgrs_tile"),
                    "assets": {
                        "red": item.assets.get("B04").href if "B04" in item.assets else None,
                        "nir": item.assets.get("B08").href if "B08" in item.assets else None,
                    },
                    "metadata": item.properties,
                })
            if scenes:
                return scenes
        return []

    # ------------------------------------------------------------------
    # Download raster band
    # ------------------------------------------------------------------
    async def download_band(self, url: str):
        r = await self.http_client.get(url)
        r.raise_for_status()
        with MemoryFile(r.content) as memfile:
            with memfile.open() as dataset:
                return dataset.read(1), dataset.transform, dataset.crs

    # ------------------------------------------------------------------
    # NDVI computation
    # ------------------------------------------------------------------
    def compute_ndvi(self, red, nir):
        denom = nir.astype(float) + red.astype(float)
        denom[denom == 0] = np.nan
        ndvi = (nir.astype(float) - red.astype(float)) / denom
        return np.clip(ndvi, -1, 1)

    # ------------------------------------------------------------------
    # Save NDVI raster to bytes
    # ------------------------------------------------------------------
    def save_ndvi_to_bytes(self, ndvi, transform, crs) -> bytes:
        profile = {
            "driver": "GTiff",
            "dtype": "float32",
            "width": ndvi.shape[1],
            "height": ndvi.shape[0],
            "count": 1,
            "crs": crs,
            "transform": transform,
            "compress": "lzw",
        }
        with MemoryFile() as memfile:
            with memfile.open(**profile) as dataset:
                dataset.write(ndvi.astype("float32"), 1)
            return memfile.read()

    # ------------------------------------------------------------------
    # Upload to Supabase Storage
    # ------------------------------------------------------------------
    async def upload_to_storage(self, file_bytes: bytes, path: str) -> str:
        self.supabase.storage.from_(STORAGE_BUCKET).upload(
            path, file_bytes, {"content-type": "image/tiff", "upsert": "true"}
        )
        return self.supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)
    # ------------------------------------------------------------------
# Process one tile (patched with country_id + logging)
# ------------------------------------------------------------------
async def process_tile(self, tile_id: str) -> Dict:
    # 1. Fetch scenes from MPC
    scenes = await self.fetch_tile_scenes(tile_id)
    if not scenes:
        return {"success": False, "tile_id": tile_id, "error": "No scenes"}

    # 2. Download red + NIR bands
    red, transform, crs = await self.download_band(scenes[0]["assets"]["red"])
    nir, _, _ = await self.download_band(scenes[0]["assets"]["nir"])
    ndvi = self.compute_ndvi(red, nir)

    # 3. Save NDVI to bytes
    ndvi_bytes = self.save_ndvi_to_bytes(ndvi, transform, crs)
    storage_path = f"{tile_id}/{datetime.utcnow().date()}/ndvi.tif"
    url = await self.upload_to_storage(ndvi_bytes, storage_path)

    # 4. Get country_id from mgrs_tiles (needed for FK constraint)
    country_resp = (
        self.supabase.table("mgrs_tiles")
        .select("country_id")
        .eq("tile_id", tile_id)
        .single()
        .execute()
    )
    country_id = None
    if country_resp.data:
        country_id = country_resp.data.get("country_id")

    if not country_id:
        logger.error(f"No country_id found for {tile_id}, skipping insert")
        return {"success": False, "tile_id": tile_id, "error": "No country_id"}

    # 5. Insert into satellite_tiles with proper FK
    row = {
        "tile_id": tile_id,
        "country_id": country_id,
        "acquisition_date": datetime.utcnow().date().isoformat(),
        "collection": "sentinel-2-l2a",
        "cloud_cover": scenes[0]["cloud_cover"],
        "ndvi_path": storage_path,
        "metadata": scenes[0]["metadata"],
        "status": "completed",
    }

    try:
        res = (
            self.supabase.table("satellite_tiles")
            .upsert(row, on_conflict="tile_id,acquisition_date,collection")  # ✅ correct
            .execute()
        )
        logger.info(f"Upsert response for {tile_id}: {res}")
        return {"success": True, "tile_id": tile_id, "ndvi_url": url}
    except Exception as e:
        logger.error(f"Supabase insert failed for {tile_id}: {e}")
        return {"success": False, "tile_id": tile_id, "error": str(e)}

  
    # ------------------------------------------------------------------
    # Cleanup old tiles
    # ------------------------------------------------------------------
    async def cleanup_old_tiles(self, days: int = RETENTION_DAYS):
        cutoff = (datetime.utcnow() - timedelta(days=days)).date().isoformat()
        old_tiles = self.supabase.table("satellite_tiles").select("*").lt("acquisition_date", cutoff).execute()
        for t in old_tiles.data:
            if t.get("ndvi_path"):
                self.supabase.storage.from_(STORAGE_BUCKET).remove([t["ndvi_path"]])
            self.supabase.table("satellite_tiles").delete().eq("id", t["id"]).execute()


# ----------------------------------------------------------------------
# Entrypoint
# ----------------------------------------------------------------------
@click.command()
@click.option("--tile-ids", help="Comma-separated list of tiles (optional)")
@click.option("--cleanup", is_flag=True, help="Cleanup old tiles")
def main(tile_ids: Optional[str], cleanup: bool):
    """Click entrypoint (sync wrapper)"""
    asyncio.run(run_main(tile_ids, cleanup))


async def run_main(tile_ids: Optional[str], cleanup: bool):
    async with NDVIHarvestWorker() as worker:
        if cleanup:
            await worker.cleanup_old_tiles()
            return

        tiles = tile_ids.split(",") if tile_ids else []
        if not tiles:
            resp = worker.supabase.rpc("get_all_tiles", {"country_code": SUPABASE_COUNTRY_CODE}).execute()
            tiles = [t["tile_id"] for t in resp.data]

        tiles = tiles[:MAX_TILES_PER_RUN]
        for t in tiles:
            try:
                res = await worker.process_tile(t)
                logger.info(f"Processed {t}: {res}")
            except Exception as e:
                logger.error(f"Failed {t}: {str(e)}")

if __name__ == "__main__":
    main()
