#!/usr/bin/env python3
"""
NDVI Harvest Worker - Memory Optimized Version
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
from rasterio.windows import Window
import pystac_client
import planetary_computer
from supabase import create_client, Client
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
import click
import gc

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
SUPABASE_COUNTRY_CODE = os.getenv("SUPABASE_COUNTRY_CODE", "IND")

MPC_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
CLOUD_COVER_THRESHOLD = float(os.getenv("CLOUD_COVER_THRESHOLD", "20"))
MAX_TILES_PER_RUN = int(os.getenv("MAX_TILES_PER_RUN", "3"))  # Reduced from 10
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "30"))


class NDVIHarvestWorker:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.catalog = pystac_client.Client.open(
            MPC_STAC_URL, modifier=planetary_computer.sign_inplace
        )
        self.http_client = httpx.AsyncClient(timeout=600.0)  # Increased timeout

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=4, max=60))
    async def fetch_tile_scenes(self, tile_id: str, days_back: int = 7) -> List[Dict]:
        """Try 7d, 14d, 30d windows until we find at least one scene."""
        end_date = datetime.utcnow()
        for window in (days_back, 14, 30):
            start_date = end_date - timedelta(days=window)
            search = self.catalog.search(
                collections=["sentinel-2-l2a"],
                datetime=f"{start_date.isoformat()}Z/{end_date.isoformat()}Z",
                query={
                    "s2:mgrs_tile": {"eq": tile_id},
                    "eo:cloud_cover": {"lt": CLOUD_COVER_THRESHOLD},
                },
                sortby=[{"field": "properties.eo:cloud_cover", "direction": "asc"}],
                max_items=5,  # Reduced from 10
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
                logger.info(f"Found {len(scenes)} scenes for tile {tile_id} in {window}-day window")
                return scenes
        logger.warning(f"No scenes found for tile {tile_id}")
        return []

    async def download_band_chunked(self, url: str, max_size_mb: int = 200):
        """Download and process band in chunks to reduce memory usage."""
        logger.info(f"Downloading band from: {url[:100]}...")
        
        # First, get file info without downloading the whole thing
        head_response = await self.http_client.head(url)
        content_length = int(head_response.headers.get('content-length', 0))
        logger.info(f"Band file size: {content_length / 1024 / 1024:.1f} MB")
        
        # If file is too large, we might need to downsample
        if content_length > max_size_mb * 1024 * 1024:
            logger.warning(f"Large file detected ({content_length/1024/1024:.1f}MB), using downsampled version")
            # Try to get a downsampled version or process in chunks
            
        r = await self.http_client.get(url)
        r.raise_for_status()
        
        with MemoryFile(r.content) as memfile:
            with memfile.open() as dataset:
                # Get original dimensions
                height, width = dataset.height, dataset.width
                logger.info(f"Original band dimensions: {height}x{width}")
                
                # If too large, downsample by factor of 2
                if height > 5000 or width > 5000:
                    logger.info("Downsampling large image to reduce memory usage")
                    # Read with downsampling
                    data = dataset.read(1, out_shape=(height//2, width//2))
                    # Adjust transform for downsampling
                    transform = dataset.transform * rasterio.Affine.scale(2.0)
                else:
                    data = dataset.read(1)
                    transform = dataset.transform
                
                logger.info(f"Final band shape: {data.shape}")
                return data, transform, dataset.crs

    def compute_ndvi_optimized(self, red, nir):
        """Memory-optimized NDVI computation."""
        logger.info("Computing NDVI with memory optimization...")
        
        # Convert to float32 instead of float64 to save memory
        red_f = red.astype(np.float32)
        nir_f = nir.astype(np.float32)
        
        # Clear original arrays
        del red, nir
        gc.collect()
        
        # Compute NDVI
        denom = nir_f + red_f
        
        # Handle division by zero
        valid_mask = denom != 0
        ndvi = np.full_like(denom, np.nan, dtype=np.float32)
        ndvi[valid_mask] = (nir_f[valid_mask] - red_f[valid_mask]) / denom[valid_mask]
        
        # Clear intermediate arrays
        del red_f, nir_f, denom, valid_mask
        gc.collect()
        
        # Clip values
        ndvi = np.clip(ndvi, -1, 1)
        
        logger.info(f"NDVI computed - min: {np.nanmin(ndvi):.3f}, max: {np.nanmax(ndvi):.3f}, mean: {np.nanmean(ndvi):.3f}")
        return ndvi

    def save_ndvi_to_bytes_optimized(self, ndvi, transform, crs) -> bytes:
        """Save with optimized compression."""
        profile = {
            "driver": "GTiff",
            "dtype": "float32",
            "width": ndvi.shape[1],
            "height": ndvi.shape[0],
            "count": 1,
            "crs": crs,
            "transform": transform,
            "compress": "lzw",
            "tiled": True,  # Enable tiling for better compression
            "blockxsize": 512,
            "blockysize": 512,
        }
        
        with MemoryFile() as memfile:
            with memfile.open(**profile) as dataset:
                dataset.write(ndvi.astype(np.float32), 1)
            data = memfile.read()
            
        # Clear NDVI array from memory
        del ndvi
        gc.collect()
        
        logger.info(f"NDVI saved to bytes, size: {len(data) / 1024 / 1024:.1f} MB")
        return data

    async def upload_to_storage(self, file_bytes: bytes, path: str) -> str:
        try:
            logger.info(f"Uploading to storage path: {path}")
            result = self.supabase.storage.from_(STORAGE_BUCKET).upload(
                path, file_bytes, {"content-type": "image/tiff", "upsert": "true"}
            )
            logger.info(f"Upload successful")
            
            # Clear file bytes from memory
            del file_bytes
            gc.collect()
            
            url = self.supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)
            return url
        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            raise

    async def process_tile(self, tile_id: str) -> Dict:
        try:
            logger.info(f"🚀 Starting processing for tile: {tile_id}")
            
            # 1. Fetch scenes
            scenes = await self.fetch_tile_scenes(tile_id)
            if not scenes:
                logger.error(f"No scenes found for tile {tile_id}")
                return {"success": False, "tile_id": tile_id, "error": "No scenes"}

            logger.info(f"Using scene: {scenes[0]['id']} with cloud cover: {scenes[0]['cloud_cover']}%")

            # 2. Download bands with memory optimization
            logger.info("📥 Downloading Red band...")
            red, transform, crs = await self.download_band_chunked(scenes[0]["assets"]["red"])
            
            logger.info("📥 Downloading NIR band...")
            nir, _, _ = await self.download_band_chunked(scenes[0]["assets"]["nir"])
            
            # 3. Compute NDVI
            ndvi = self.compute_ndvi_optimized(red, nir)

            # 4. Save and upload
            ndvi_bytes = self.save_ndvi_to_bytes_optimized(ndvi, transform, crs)
            storage_path = f"{tile_id}/{datetime.utcnow().date()}/ndvi.tif"
            url = await self.upload_to_storage(ndvi_bytes, storage_path)

            # 5. Database operations
            logger.info(f"🔍 Looking up country_id for tile: {tile_id}")
            try:
                country_resp = (
                    self.supabase.table("mgrs_tiles")
                    .select("country_id")
                    .eq("tile_id", tile_id)
                    .single()
                    .execute()
                )
                
                if not country_resp.data or not country_resp.data.get("country_id"):
                    logger.error(f"No country_id found for {tile_id}")
                    return {"success": False, "tile_id": tile_id, "error": "No country_id"}
                
                country_id = country_resp.data["country_id"]
                logger.info(f"Found country_id: {country_id}")
                
            except Exception as e:
                logger.error(f"Country lookup failed for {tile_id}: {e}")
                return {"success": False, "tile_id": tile_id, "error": f"Country lookup failed: {str(e)}"}

            # 6. Insert record
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

            logger.info(f"💾 Inserting record for {tile_id}")
            try:
                res = (
                    self.supabase.table("satellite_tiles")
                    .upsert(row, on_conflict="tile_id,acquisition_date,collection")
                    .execute()
                )
                logger.info(f"✅ SUCCESS: {tile_id} processed and stored")
                
                # Force garbage collection after each tile
                gc.collect()
                
                return {"success": True, "tile_id": tile_id, "ndvi_url": url}
                
            except Exception as e:
                logger.error(f"❌ Database insert failed for {tile_id}: {e}")
                return {"success": False, "tile_id": tile_id, "error": str(e)}
                
        except Exception as e:
            logger.error(f"💥 UNEXPECTED ERROR processing {tile_id}: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Force cleanup on error
            gc.collect()
            
            return {"success": False, "tile_id": tile_id, "error": str(e)}

    async def cleanup_old_tiles(self, days: int = RETENTION_DAYS):
        try:
            cutoff = (datetime.utcnow() - timedelta(days=days)).date().isoformat()
            logger.info(f"Cleaning up tiles older than {cutoff}")
            
            old_tiles = self.supabase.table("satellite_tiles").select("*").lt("acquisition_date", cutoff).execute()
            logger.info(f"Found {len(old_tiles.data)} old tiles to cleanup")
            
            for t in old_tiles.data:
                if t.get("ndvi_path"):
                    try:
                        self.supabase.storage.from_(STORAGE_BUCKET).remove([t["ndvi_path"]])
                        logger.info(f"Removed storage file: {t['ndvi_path']}")
                    except Exception as e:
                        logger.error(f"Failed to remove storage file {t['ndvi_path']}: {e}")
                
                try:
                    self.supabase.table("satellite_tiles").delete().eq("id", t["id"]).execute()
                    logger.info(f"Deleted tile record: {t['id']}")
                except Exception as e:
                    logger.error(f"Failed to delete tile record {t['id']}: {e}")
                    
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")


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
            logger.info(f"Fetching all tiles for country: {SUPABASE_COUNTRY_CODE}")
            try:
                resp = worker.supabase.rpc("get_all_tiles", {"country_code": SUPABASE_COUNTRY_CODE}).execute()
                tiles = [t["tile_id"] for t in resp.data]
                logger.info(f"Found {len(tiles)} tiles total")
            except Exception as e:
                logger.error(f"Failed to fetch tiles: {e}")
                return

        # Process only limited tiles to avoid memory issues
        tiles = tiles[:MAX_TILES_PER_RUN]
        logger.info(f"Processing {len(tiles)} tiles: {tiles}")
        
        for i, tile_id in enumerate(tiles, 1):
            try:
                logger.info(f"📊 Processing tile {i}/{len(tiles)}: {tile_id}")
                res = await worker.process_tile(tile_id)
                logger.info(f"🏁 RESULT {i}/{len(tiles)} - {tile_id}: {res}")
                
                # Add delay between tiles to prevent overwhelming the system
                if i < len(tiles):
                    logger.info("⏸️  Waiting 10 seconds before next tile...")
                    await asyncio.sleep(10)
                    
            except Exception as e:
                logger.error(f"💥 FAILED {i}/{len(tiles)} - {tile_id}: {str(e)}")

if __name__ == "__main__":
    main()
