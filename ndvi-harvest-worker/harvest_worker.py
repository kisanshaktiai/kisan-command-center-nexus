#!/usr/bin/env python3
"""
NDVI Harvest Worker - Auto Agriculture Detection
"""

import os
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

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
# Logging
# ----------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("NDVIHarvestWorker")

# ----------------------------------------------------------------------
# Env
# ----------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qfklkkzxemsbeniyugiz.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFma2xra3p4ZW1zYmVuaXl1Z2l6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQyNzE2NSwiZXhwIjoyMDY4MDAzMTY1fQ.CBl6gNq11KiMiYuNiXytvJlrsaC82CJ3H_jf2dzJe0I")
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "satellite-tiles")
SUPABASE_COUNTRY_CODE = os.getenv("SUPABASE_COUNTRY_CODE", "IND")

MPC_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
CLOUD_COVER_THRESHOLD = float(os.getenv("CLOUD_COVER_THRESHOLD", "20"))
MAX_TILES_PER_RUN = int(os.getenv("MAX_TILES_PER_RUN", "5"))
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "30"))
MAX_CONCURRENT_TILES = int(os.getenv("MAX_CONCURRENT_TILES", "3"))

# ----------------------------------------------------------------------
# Helper
# ----------------------------------------------------------------------
def sanitize_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    clean = {}
    for k, v in metadata.items():
        if k.startswith("_") or v is None:
            continue
        if isinstance(v, (datetime, np.datetime64)):
            clean[k] = str(v)
        elif isinstance(v, (np.integer, np.floating)):
            clean[k] = float(v)
        elif isinstance(v, (list, dict)):
            try:
                json.dumps(v)
                clean[k] = v
            except Exception:
                continue
        else:
            clean[k] = v
    return clean

# ----------------------------------------------------------------------
# Worker
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

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()

    # ------------------------------------------------------------------
    # Fetch MPC scenes
    # ------------------------------------------------------------------
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=4, max=60))
    async def fetch_tile_scenes(self, tile_id: str, days_back: int = 7) -> List[Dict]:
        end_date = datetime.utcnow()
        for window in (days_back, 14, 30):
            start_date = end_date - timedelta(days=window)
            try:
                search = self.catalog.search(
                    collections=["sentinel-2-l2a"],
                    datetime=f"{start_date.isoformat()}Z/{end_date.isoformat()}Z",
                    query={
                        "s2:mgrs_tile": {"eq": tile_id},
                        "eo:cloud_cover": {"lt": CLOUD_COVER_THRESHOLD},
                    },
                    sortby=[{"field": "properties.eo:cloud_cover", "direction": "asc"}],
                    max_items=5,
                )
                scenes = []
                for item in search.items():
                    if "B04" not in item.assets or "B08" not in item.assets:
                        continue
                    scenes.append({
                        "id": item.id,
                        "datetime": item.datetime.isoformat(),
                        "cloud_cover": item.properties.get("eo:cloud_cover", 0),
                        "tile_id": item.properties.get("s2:mgrs_tile"),
                        "assets": {
                            "red": item.assets["B04"].href,
                            "nir": item.assets["B08"].href,
                        },
                        "metadata": item.properties,
                    })
                if scenes:
                    return scenes
            except Exception as e:
                logger.error(f"Scene search error {tile_id}: {e}")
        return []

    # ------------------------------------------------------------------
    # Download raster
    # ------------------------------------------------------------------
    async def download_band(self, url: str):
        r = await self.http_client.get(url)
        r.raise_for_status()
        with MemoryFile(r.content) as memfile:
            with memfile.open() as dataset:
                return dataset.read(1), dataset.transform, dataset.crs

    # ------------------------------------------------------------------
    # NDVI
    # ------------------------------------------------------------------
    def compute_ndvi(self, red, nir):
        red, nir = red.astype(np.float32), nir.astype(np.float32)
        valid_mask = (red > 0) & (nir > 0) & (red < 65535) & (nir < 65535)
        denom = nir + red
        denom[denom == 0] = np.nan
        ndvi = np.where(valid_mask, (nir - red) / denom, np.nan)
        return np.clip(ndvi, -1, 1)

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
            "nodata": np.nan,
        }
        with MemoryFile() as memfile:
            with memfile.open(**profile) as dataset:
                dataset.write(ndvi.astype(np.float32), 1)
            return memfile.read()

    # ------------------------------------------------------------------
    # Storage
    # ------------------------------------------------------------------
    async def upload_to_storage(self, file_bytes: bytes, path: str) -> str:
        try:
            try:
                buckets = self.supabase.storage.list_buckets()
                if STORAGE_BUCKET not in [b.name for b in buckets]:
                    self.supabase.storage.create_bucket(STORAGE_BUCKET, {"public": True})
            except Exception:
                pass
            self.supabase.storage.from_(STORAGE_BUCKET).upload(
                path, file_bytes, {"content-type": "image/tiff", "upsert": "true"}
            )
            return self.supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)
        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            raise

    # ------------------------------------------------------------------
    # Process tile
    # ------------------------------------------------------------------
    async def process_tile(self, tile_id: str) -> Dict:
        logger.info(f"🚀 Processing tile: {tile_id}")

        try:
            # ✅ Always get country_id from mgrs_tiles
            mgrs_resp = (
                self.supabase.table("mgrs_tiles")
                .select("country_id, tile_id")
                .eq("tile_id", tile_id)
                .single()
                .execute()
            )

            if not mgrs_resp.data:
                logger.error(f"❌ Tile {tile_id} not found in mgrs_tiles table")
                return {"success": False, "tile_id": tile_id, "error": "Tile not found in mgrs_tiles"}

            country_id = mgrs_resp.data["country_id"]
            if not country_id:
                logger.error(f"❌ No country_id for tile {tile_id}")
                return {"success": False, "tile_id": tile_id, "error": "No country_id"}

            logger.info(f"✅ Found tile {tile_id} with country_id: {country_id}")

            # Fetch scenes
            scenes = await self.fetch_tile_scenes(tile_id)
            if not scenes:
                logger.error(f"❌ No scenes found for {tile_id}")
                return {"success": False, "tile_id": tile_id, "error": "No suitable scenes found"}

            best_scene = scenes[0]
            logger.info(f"Using scene: {best_scene['id']} (cloud cover: {best_scene['cloud_cover']}%)")

            # Download bands
            red, transform, crs = await self.download_band(best_scene["assets"]["red"])
            nir, _, _ = await self.download_band(best_scene["assets"]["nir"])

            # Compute NDVI
            ndvi = self.compute_ndvi(red, nir)

            # Save NDVI
            ndvi_bytes = self.save_ndvi_to_bytes(ndvi, transform, crs)

            # Scene date for naming
            scene_date = datetime.fromisoformat(best_scene["datetime"].replace("Z", "+00:00"))
            date_str = scene_date.strftime("%Y-%m-%d")
            storage_path = f"{tile_id}/{date_str}/ndvi.tif"

            # Upload to storage
            ndvi_url = await self.upload_to_storage(ndvi_bytes, storage_path)

            # Prepare database record
            acquisition_date = scene_date.date()

            metadata = best_scene["metadata"].copy()
            for key in list(metadata.keys()):
                if metadata[key] is None or key.startswith("_"):
                    metadata.pop(key, None)

            row_data = {
                "tile_id": tile_id,
                "country_id": country_id,  # ✅ matches mgrs_tiles FK
                "acquisition_date": acquisition_date.isoformat(),
                "collection": "sentinel-2-l2a",
                "cloud_cover": float(best_scene["cloud_cover"]),
                "ndvi_path": storage_path,
                "red_band_path": best_scene["assets"]["red"],
                "nir_band_path": best_scene["assets"]["nir"],
                "metadata": metadata,
                "file_size_mb": round(len(ndvi_bytes) / (1024 * 1024), 2),
                "processing_level": "L2A",
                "status": "completed",
            }

            logger.info(f"Inserting record for {tile_id} with acquisition_date: {acquisition_date}")

            result = (
                self.supabase.table("satellite_tiles")
                .upsert(row_data, on_conflict="tile_id,acquisition_date,collection")
                .execute()
            )

            if hasattr(result, "error") and result.error:
                logger.error(f"❌ Database upsert failed for {tile_id}: {result.error}")
                return {"success": False, "tile_id": tile_id, "error": f"Database error: {result.error}"}

            logger.info(f"✅ Successfully processed {tile_id}")
            logger.info(f"   - NDVI URL: {ndvi_url}")
            logger.info(f"   - Database record: {len(result.data) if result.data else 0} rows affected")

            return {
                "success": True,
                "tile_id": tile_id,
                "ndvi_url": ndvi_url,
                "acquisition_date": acquisition_date.isoformat(),
                "cloud_cover": best_scene["cloud_cover"],
                "scene_id": best_scene["id"],
            }

        except Exception as e:
            logger.error(f"💥 Error processing {tile_id}: {e}")
            import traceback
            logger.error(traceback.format_exc())

            try:
                error_record = {
                    "tile_id": tile_id,
                    "country_id": country_id if "country_id" in locals() else None,
                    "acquisition_date": datetime.utcnow().date().isoformat(),
                    "collection": "sentinel-2-l2a",
                    "status": "failed",
                    "error_message": str(e)[:500],
                }
                if error_record["country_id"]:
                    self.supabase.table("satellite_tiles").insert(error_record).execute()
            except Exception as insert_error:
                logger.error(f"Failed to insert error record: {insert_error}")

            return {"success": False, "tile_id": tile_id, "error": str(e)}


    # ------------------------------------------------------------------
    # Get tiles to process
    # ------------------------------------------------------------------
    async def get_tiles_to_process(self, country_code: str) -> List[str]: # Line 212
        """Get tiles that need processing for a country code"""
        logger.info(f"Getting tiles to process for country: {country_code}")

        try:
            # Step 1: lookup country_id from countries table
            country_result = (
                self.supabase.table("countries")
                .select("id")
                .eq("code", country_code)
                .single()
                .execute()
            )

            if not country_result.data:
                logger.error(f"Country with code {country_code} not found")
                return []

            country_id = country_result.data["id"]
            logger.info(f"Found country_id: {country_id} for code: {country_code}")

            # Step 2: Try RPC first
            result = self.supabase.rpc(
                "get_tiles_for_processing",
                {"country_code": country_code, "days_since_last_update": 7}
            ).execute()

            if result.data and len(result.data) > 0:
                tiles = [row["tile_id"] for row in result.data]
                logger.info(f"Found {len(tiles)} tiles via RPC")
                return tiles

            # Step 3: fallback direct query to mgrs_tiles
            logger.warning("No tiles found from RPC, falling back to direct query...")
            result = (
                self.supabase.table("mgrs_tiles")
                .select("tile_id")
                .eq("country_id", country_id)
                .limit(MAX_TILES_PER_RUN)
                .execute()
            )

            if result.data:
                tiles = [row["tile_id"] for row in result.data]
                logger.info(f"Found {len(tiles)} tiles via direct query")
                return tiles
            else:
                logger.warning("No tiles found in direct query")

        except Exception as e:
            logger.error(f"Error getting tiles to process: {e}")
            import traceback
            logger.error(traceback.format_exc())

        return []


    # ------------------------------------------------------------------
    # Cleanup old tiles
    # ------------------------------------------------------------------
    async def cleanup_old_tiles(self, archive: bool = False):
        cutoff_date = (datetime.utcnow() - timedelta(days=RETENTION_DAYS)).date()
        try:
            old_records = (
                self.supabase.table("satellite_tiles")
                .select("id, ndvi_path")
                .lt("acquisition_date", cutoff_date.isoformat())
                .execute()
            )
            if not old_records.data:
                return
            for rec in old_records.data:
                if rec.get("ndvi_path"):
                    if archive:
                        new_path = f"archive/{rec['ndvi_path']}"
                        self.supabase.storage.from_(STORAGE_BUCKET).move(rec["ndvi_path"], new_path)
                    else:
                        self.supabase.storage.from_(STORAGE_BUCKET).remove([rec["ndvi_path"]])
            self.supabase.table("satellite_tiles").delete().lt("acquisition_date", cutoff_date.isoformat()).execute()
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

# ----------------------------------------------------------------------
# Entrypoint
# ----------------------------------------------------------------------
@click.command()
@click.option("--tile-ids", help="Comma-separated list of tiles")
@click.option("--cleanup", is_flag=True, help="Cleanup old tiles")
@click.option("--country-code", default=SUPABASE_COUNTRY_CODE, help="Country code to process")
def main(tile_ids: Optional[str], cleanup: bool, country_code: str):
    asyncio.run(run_main(tile_ids, cleanup, country_code))

async def run_main(tile_ids: Optional[str], cleanup: bool, country_code: str):
    async with NDVIHarvestWorker() as worker:
        if cleanup:
            await worker.cleanup_old_tiles()

        if tile_ids:
            tiles = [t.strip() for t in tile_ids.split(",")]
        else:
            tiles = await worker.get_tiles_to_process(country_code)
        if not tiles:
            logger.warning("No tiles to process")
            return

        tiles = tiles[:MAX_TILES_PER_RUN]
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_TILES)

        async def sem_task(tile):
            async with semaphore:
                return await worker.process_tile(tile)

        results = await asyncio.gather(*(sem_task(tile) for tile in tiles), return_exceptions=True)

        successes = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
        logger.info(f"🎯 {successes}/{len(results)} tiles processed successfully")

if __name__ == "__main__":
    main()
