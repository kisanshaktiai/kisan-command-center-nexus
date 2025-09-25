#!/usr/bin/env python3
"""
NDVI Harvest Worker for SaaS Admin (Global)
Fetches Sentinel-2 data from Microsoft Planetary Computer and computes NDVI
Stores global NDVI tiles in satellite_tiles table
"""

import os
import sys
import hashlib
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

import numpy as np
import rasterio
from rasterio.io import MemoryFile
import pystac_client
import planetary_computer
from supabase import create_client, Client
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
import click

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "satellite-tiles")
MPC_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
CLOUD_COVER_THRESHOLD = float(os.getenv("CLOUD_COVER_THRESHOLD", "20"))
MAX_TILES_PER_RUN = int(os.getenv("MAX_TILES_PER_RUN", "10"))
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "30"))
GLOBAL_TENANT_ID = os.getenv("GLOBAL_TENANT_ID", "00000000-0000-0000-0000-000000000000")

class NDVIHarvestWorker:
    """Global worker for harvesting NDVI data"""

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

    # ----------------------------
    # Scene Fetching
    # ----------------------------
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=60))
    async def fetch_tile_scenes(self, tile_id: str, days_back: int = 7) -> List[Dict]:
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)

            search = self.catalog.search(
                collections=["sentinel-2-l2a"],
                datetime=f"{start_date.isoformat()}Z/{end_date.isoformat()}Z",
                query={
                    "s2:mgrs_tile": {"eq": tile_id},
                    "eo:cloud_cover": {"lt": CLOUD_COVER_THRESHOLD},
                },
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

            logger.info(f"Found {len(scenes)} scenes for tile {tile_id}")
            return scenes
        except Exception as e:
            logger.error(f"Error fetching scenes for tile {tile_id}: {str(e)}")
            raise

    async def download_band(self, url: str):
        response = await self.http_client.get(url)
        response.raise_for_status()

        with MemoryFile(response.content) as memfile:
            with memfile.open() as dataset:
                return dataset.read(1), dataset.transform, dataset.crs

    def compute_ndvi(self, red: np.ndarray, nir: np.ndarray) -> np.ndarray:
        denominator = nir.astype(float) + red.astype(float)
        denominator[denominator == 0] = np.nan
        ndvi = (nir.astype(float) - red.astype(float)) / denominator
        return np.clip(ndvi, -1, 1)

    async def create_median_composite(self, scenes: List[Dict], tile_id: str):
        ndvi_stack, valid_dates = [], []
        for scene in scenes[:5]:
            try:
                red_data, transform, crs = await self.download_band(scene["assets"]["red"])
                nir_data, _, _ = await self.download_band(scene["assets"]["nir"])
                ndvi = self.compute_ndvi(red_data, nir_data)
                ndvi_stack.append(ndvi)
                valid_dates.append(scene["datetime"])
            except Exception as e:
                logger.warning(f"Failed to process scene {scene['id']}: {e}")
        if not ndvi_stack:
            raise ValueError(f"No valid scenes found for tile {tile_id}")
        return np.nanmedian(np.stack(ndvi_stack), axis=0), {
            "composite_type": "median",
            "num_scenes": len(ndvi_stack),
            "scene_dates": valid_dates,
            "tile_id": tile_id,
        }, transform, crs

    def save_ndvi_to_bytes(self, ndvi: np.ndarray, transform, crs) -> bytes:
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

    async def upload_to_storage(self, file_bytes: bytes, path: str) -> str:
        self.supabase.storage.from_(STORAGE_BUCKET).upload(
            path, file_bytes, {"content-type": "image/tiff"}
        )
        return self.supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)

    def calculate_checksum(self, data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    # ----------------------------
    # Tile Processing
    # ----------------------------
    async def process_tile(self, tile_id: str, requested_date: Optional[str] = None) -> Dict:
        job_id = None
        try:
            job_data = {
                "job_type": "tile_harvest",
                "status": "running",
                "tenant_id": GLOBAL_TENANT_ID,
                "target_type": "tile",
                "parameters": {"tile_id": tile_id, "requested_date": requested_date},
                "started_at": datetime.now().isoformat(),
            }
            job_response = self.supabase.table("system_jobs").insert(job_data).execute()
            job_id = job_response.data[0]["id"]

            scenes = await self.fetch_tile_scenes(tile_id)
            if not scenes:
                raise ValueError(f"No scenes for tile {tile_id}")

            if len(scenes) > 1:
                ndvi_array, metadata, transform, crs = await self.create_median_composite(scenes, tile_id)
                acquisition_date = datetime.now().date().isoformat()
            else:
                scene = scenes[0]
                red_data, transform, crs = await self.download_band(scene["assets"]["red"])
                nir_data, _, _ = await self.download_band(scene["assets"]["nir"])
                ndvi_array = self.compute_ndvi(red_data, nir_data)
                metadata = scene["metadata"]
                acquisition_date = datetime.fromisoformat(scene["datetime"]).date().isoformat()

            ndvi_bytes = self.save_ndvi_to_bytes(ndvi_array, transform, crs)
            checksum = self.calculate_checksum(ndvi_bytes)
            storage_path = f"{tile_id}/{acquisition_date}/ndvi.tif"
            ndvi_url = await self.upload_to_storage(ndvi_bytes, storage_path)

            tile_data = {
                "tile_id": tile_id,
                "acquisition_date": acquisition_date,
                "collection": "sentinel-2-l2a",
                "cloud_cover": scenes[0]["cloud_cover"],
                "ndvi_path": storage_path,
                "metadata": metadata,
                "file_size_mb": len(ndvi_bytes) / (1024 * 1024),
                "checksum": checksum,
                "status": "completed",
                "tenant_id": GLOBAL_TENANT_ID,
            }
            self.supabase.table("satellite_tiles").upsert(tile_data).execute()

            self.supabase.table("system_jobs").update({
                "status": "completed",
                "progress": 100,
                "completed_at": datetime.now().isoformat(),
                "result": {"ndvi_url": ndvi_url, "checksum": checksum},
            }).eq("id", job_id).execute()

            return {"success": True, "tile_id": tile_id, "ndvi_url": ndvi_url}
        except Exception as e:
            logger.error(f"Error processing tile {tile_id}: {e}")
            if job_id:
                self.supabase.table("system_jobs").update({
                    "status": "failed",
                    "completed_at": datetime.now().isoformat(),
                    "error_message": str(e),
                }).eq("id", job_id).execute()
            raise

    async def cleanup_old_tiles(self, retention_days: int = RETENTION_DAYS):
        cutoff_date = (datetime.now() - timedelta(days=retention_days)).date().isoformat()
        old_tiles = self.supabase.table("satellite_tiles").select("*").lt(
            "acquisition_date", cutoff_date
        ).execute()
        for tile in old_tiles.data:
            if tile.get("ndvi_path"):
                self.supabase.storage.from_(STORAGE_BUCKET).remove([tile["ndvi_path"]])
            self.supabase.table("satellite_tiles").delete().eq("id", tile["id"]).execute()
        logger.info(f"Cleaned {len(old_tiles.data)} old tiles")

# ----------------------------
# CLI Entrypoint
# ----------------------------
@click.command()
@click.option("--tile-ids", help="Comma-separated list of tile IDs")
@click.option("--all-tiles", is_flag=True, help="Process all tiles globally")
@click.option("--cleanup", is_flag=True, help="Cleanup old tiles")
async def main(tile_ids: Optional[str], all_tiles: bool, cleanup: bool):
    async with NDVIHarvestWorker() as worker:
        if cleanup:
            await worker.cleanup_old_tiles()
            return

        if all_tiles:
            response = worker.supabase.rpc("get_all_tiles").execute()
            tiles_to_process = [tile["tile_id"] for tile in response.data]
        elif tile_ids:
            tiles_to_process = tile_ids.split(",")
        else:
            logger.error("Must specify --tile-ids or --all-tiles")
            return

        tiles_to_process = tiles_to_process[:MAX_TILES_PER_RUN]
        for tile_id in tiles_to_process:
            try:
                await worker.process_tile(tile_id.strip())
            except Exception as e:
                logger.error(f"Failed tile {tile_id}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
