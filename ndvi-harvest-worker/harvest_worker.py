#!/usr/bin/env python3
"""
NDVI Harvest Worker - Fixed for FK + Logging + Storage Issues
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
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "satellite-tiles")
SUPABASE_COUNTRY_CODE = os.getenv("SUPABASE_COUNTRY_CODE", "IND")

MPC_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
CLOUD_COVER_THRESHOLD = float(os.getenv("CLOUD_COVER_THRESHOLD", "20"))
MAX_TILES_PER_RUN = int(os.getenv("MAX_TILES_PER_RUN", "5"))
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "30"))


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
            logger.info(f"Searching for scenes in {tile_id} from {start_date} to {end_date}")
            
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
                    # Check if required assets exist
                    if "B04" not in item.assets or "B08" not in item.assets:
                        logger.warning(f"Scene {item.id} missing required bands")
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
                    logger.info(f"Found {len(scenes)} scenes for {tile_id}")
                    return scenes
                else:
                    logger.info(f"No suitable scenes found for {tile_id} in {window}-day window")
                    
            except Exception as e:
                logger.error(f"Error searching for scenes in {tile_id}: {e}")
                continue
                
        logger.warning(f"No scenes found for {tile_id} after trying all windows")
        return []

    # ------------------------------------------------------------------
    # Download raster
    # ------------------------------------------------------------------
    async def download_band(self, url: str):
        logger.info(f"Downloading band from {url[:100]}...")
        try:
            r = await self.http_client.get(url)
            r.raise_for_status()
            logger.info(f"Downloaded {len(r.content)} bytes")
            
            with MemoryFile(r.content) as memfile:
                with memfile.open() as dataset:
                    data = dataset.read(1)
                    transform = dataset.transform
                    crs = dataset.crs
                    logger.info(f"Raster shape: {data.shape}, CRS: {crs}")
                    return data, transform, crs
        except Exception as e:
            logger.error(f"Failed to download band from {url}: {e}")
            raise

    # ------------------------------------------------------------------
    # NDVI
    # ------------------------------------------------------------------
    def compute_ndvi(self, red, nir):
        logger.info("Computing NDVI...")
        # Handle invalid values
        red = red.astype(np.float32)
        nir = nir.astype(np.float32)
        
        # Mask invalid pixels
        valid_mask = (red > 0) & (nir > 0) & (red < 65535) & (nir < 65535)
        
        denom = nir + red
        denom[denom == 0] = np.nan
        
        ndvi = np.where(valid_mask, (nir - red) / denom, np.nan)
        ndvi = np.clip(ndvi, -1, 1)
        
        valid_pixels = np.sum(~np.isnan(ndvi))
        total_pixels = ndvi.size
        logger.info(f"NDVI computed: {valid_pixels}/{total_pixels} valid pixels")
        
        return ndvi

    def save_ndvi_to_bytes(self, ndvi, transform, crs) -> bytes:
        logger.info("Saving NDVI to bytes...")
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
            data = memfile.read()
            logger.info(f"NDVI GeoTIFF size: {len(data)} bytes")
            return data

    # ------------------------------------------------------------------
    # Storage
    # ------------------------------------------------------------------
    async def upload_to_storage(self, file_bytes: bytes, path: str) -> str:
        logger.info(f"Uploading to storage: {path}")
        try:
            # Check if bucket exists, create if not
            try:
                buckets = self.supabase.storage.list_buckets()
                bucket_names = [b.name for b in buckets]
                if STORAGE_BUCKET not in bucket_names:
                    logger.info(f"Creating bucket: {STORAGE_BUCKET}")
                    self.supabase.storage.create_bucket(STORAGE_BUCKET, {"public": True})
            except Exception as e:
                logger.warning(f"Could not check/create bucket: {e}")
            
            # Upload file
            result = self.supabase.storage.from_(STORAGE_BUCKET).upload(
                path, 
                file_bytes, 
                {
                    "content-type": "image/tiff", 
                    "upsert": "true"
                }
            )
            
            if hasattr(result, 'error') and result.error:
                logger.error(f"Storage upload failed: {result.error}")
                raise Exception(f"Storage upload failed: {result.error}")
            
            # Get public URL
            url = self.supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)
            logger.info(f"File uploaded successfully to: {url}")
            return url
            
        except Exception as e:
            logger.error(f"Failed to upload to storage: {e}")
            raise

    # ------------------------------------------------------------------
    # Process tile
    # ------------------------------------------------------------------
    async def process_tile(self, tile_id: str) -> Dict:
        logger.info(f"🚀 Processing tile: {tile_id}")
        
        try:
            # First, verify tile exists in mgrs_tiles
            logger.info(f"Checking if tile {tile_id} exists in mgrs_tiles...")
            mgrs_resp = (
                self.supabase.table("mgrs_tiles")
                .select("country_id, tile_id")
                .eq("tile_id", tile_id)
                .execute()
            )
            
            if not mgrs_resp.data:
                logger.error(f"❌ Tile {tile_id} not found in mgrs_tiles table")
                return {"success": False, "tile_id": tile_id, "error": "Tile not found in mgrs_tiles"}
            
            country_id = mgrs_resp.data[0]["country_id"]
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
            
            # Use scene's actual date for file naming
            scene_date = datetime.fromisoformat(best_scene["datetime"].replace('Z', '+00:00'))
            date_str = scene_date.strftime('%Y-%m-%d')
            storage_path = f"{tile_id}/{date_str}/ndvi.tif"
            
            # Upload to storage
            ndvi_url = await self.upload_to_storage(ndvi_bytes, storage_path)

            # Prepare database record
            acquisition_date = scene_date.date()
            
            # Clean metadata for JSON storage
            metadata = best_scene["metadata"].copy()
            # Remove any problematic fields that might cause JSON serialization issues
            for key in list(metadata.keys()):
                if metadata[key] is None or key.startswith('_'):
                    metadata.pop(key, None)

            row_data = {
                "tile_id": tile_id,
                "country_id": country_id,
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
            
            # Insert/update database record
            result = (
                self.supabase.table("satellite_tiles")
                .upsert(
                    row_data, 
                    on_conflict="tile_id,acquisition_date,collection"
                )
                .execute()
            )
            
            if hasattr(result, 'error') and result.error:
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
                "scene_id": best_scene["id"]
            }

        except Exception as e:
            logger.error(f"💥 Error processing {tile_id}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Try to insert failed record
            try:
                error_record = {
                    "tile_id": tile_id,
                    "country_id": country_id if 'country_id' in locals() else None,
                    "acquisition_date": datetime.utcnow().date().isoformat(),
                    "collection": "sentinel-2-l2a",
                    "status": "failed",
                    "error_message": str(e)[:500],  # Truncate error message
                }
                
                if error_record["country_id"]:
                    self.supabase.table("satellite_tiles").insert(error_record).execute()
                    
            except Exception as insert_error:
                logger.error(f"Failed to insert error record: {insert_error}")
            
            return {"success": False, "tile_id": tile_id, "error": str(e)}

    # ------------------------------------------------------------------
    # Get tiles to process
    # ------------------------------------------------------------------
    async def get_tiles_to_process(self, country_code: str) -> List[str]:
        """Get tiles that need processing"""
        logger.info(f"Getting tiles to process for country: {country_code}")
        
        try:
            # Get tiles from mgrs_tiles that haven't been processed recently
            result = self.supabase.rpc(
                "get_tiles_for_processing", 
                {
                    "country_code": country_code,
                    "days_since_last_update": 7
                }
            ).execute()
            
            if result.data:
                tiles = [row["tile_id"] for row in result.data]
                logger.info(f"Found {len(tiles)} tiles to process")
                return tiles
            else:
                logger.warning("No tiles found from RPC, trying direct query...")
                # Fallback to direct query
                result = (
                    self.supabase.table("mgrs_tiles")
                    .select("tile_id")
                    .eq("country_id", "your_country_uuid")  # You'll need to set this
                    .limit(MAX_TILES_PER_RUN)
                    .execute()
                )
                
                if result.data:
                    tiles = [row["tile_id"] for row in result.data]
                    logger.info(f"Found {len(tiles)} tiles via direct query")
                    return tiles
                
        except Exception as e:
            logger.error(f"Error getting tiles to process: {e}")
        
        return []

    # ------------------------------------------------------------------
    # Cleanup old tiles
    # ------------------------------------------------------------------
    async def cleanup_old_tiles(self):
        """Remove old satellite tile records and files"""
        logger.info("Starting cleanup of old tiles...")
        
        try:
            cutoff_date = (datetime.utcnow() - timedelta(days=RETENTION_DAYS)).date()
            
            # Get old records
            old_records = (
                self.supabase.table("satellite_tiles")
                .select("id, ndvi_path")
                .lt("acquisition_date", cutoff_date.isoformat())
                .execute()
            )
            
            if old_records.data:
                logger.info(f"Found {len(old_records.data)} old records to clean up")
                
                # Delete storage files
                for record in old_records.data:
                    if record.get("ndvi_path"):
                        try:
                            self.supabase.storage.from_(STORAGE_BUCKET).remove([record["ndvi_path"]])
                            logger.info(f"Deleted storage file: {record['ndvi_path']}")
                        except Exception as e:
                            logger.warning(f"Failed to delete storage file {record['ndvi_path']}: {e}")
                
                # Delete database records
                delete_result = (
                    self.supabase.table("satellite_tiles")
                    .delete()
                    .lt("acquisition_date", cutoff_date.isoformat())
                    .execute()
                )
                
                logger.info(f"Cleaned up {len(delete_result.data) if delete_result.data else 0} old records")
            else:
                logger.info("No old records found to clean up")
                
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# ----------------------------------------------------------------------
# Entrypoint
# ----------------------------------------------------------------------
@click.command()
@click.option("--tile-ids", help="Comma-separated list of tiles (optional)")
@click.option("--cleanup", is_flag=True, help="Cleanup old tiles")
@click.option("--country-code", default=SUPABASE_COUNTRY_CODE, help="Country code to process")
def main(tile_ids: Optional[str], cleanup: bool, country_code: str):
    asyncio.run(run_main(tile_ids, cleanup, country_code))


async def run_main(tile_ids: Optional[str], cleanup: bool, country_code: str):
    async with NDVIHarvestWorker() as worker:
        
        if cleanup:
            await worker.cleanup_old_tiles()
        
        # Get tiles to process
        if tile_ids:
            tiles = [t.strip() for t in tile_ids.split(",")]
            logger.info(f"Processing specified tiles: {tiles}")
        else:
            tiles = await worker.get_tiles_to_process(country_code)
        
        if not tiles:
            logger.warning("No tiles to process")
            return
        
        # Limit tiles per run
        tiles = tiles[:MAX_TILES_PER_RUN]
        logger.info(f"Processing {len(tiles)} tiles: {tiles}")
        
        # Process tiles
        results = []
        for tile in tiles:
            result = await worker.process_tile(tile)
            results.append(result)
            logger.info(f"Result for {tile}: {'✅ Success' if result['success'] else '❌ Failed'}")
            
            # Add delay between tiles to avoid rate limiting
            if len(tiles) > 1:
                await asyncio.sleep(2)
        
        # Summary
        successful = sum(1 for r in results if r["success"])
        logger.info(f"🎯 Processing complete: {successful}/{len(results)} tiles successful")


if __name__ == "__main__":
    main()
