import os, tempfile, json
from datetime import datetime
import numpy as np
import rasterio
import planetary_computer as pc
from pystac_client import Client
from supabase import create_client, Client as SupaClient

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET = os.getenv("STORAGE_BUCKET", "satellite-tiles")
COUNTRY_CODE = os.getenv("SUPABASE_COUNTRY_CODE", "IND")
CLOUD_COVER = float(os.getenv("CLOUD_COVER_THRESHOLD", "20"))

supabase: SupaClient = create_client(SUPABASE_URL, SUPABASE_KEY)

# Helpers
def get_country_id():
    res = supabase.table("countries").select("id").eq("code", COUNTRY_CODE).execute()
    return res.data[0]["id"]

def get_mgrs_tiles(country_id, limit=50):
    res = supabase.rpc("get_tiles_for_processing", {"p_country_id": country_id, "p_limit": limit}).execute()
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
        return datetime.fromisoformat(res.data[0]["acquisition_date"])
    return datetime(2020, 1, 1)

def compute_ndvi(red, nir, out):
    with rasterio.open(red) as r, rasterio.open(nir) as n:
        red_band = r.read(1).astype("float32")
        nir_band = n.read(1).astype("float32")
        ndvi = (nir_band - red_band) / (nir_band + red_band + 1e-6)
        profile = r.profile
        profile.update(dtype="float32", count=1)
        with rasterio.open(out, "w", **profile) as dst:
            dst.write(ndvi, 1)

def upload(tile_id, country_id, date, ndvi_path, red_url, nir_url, scene):
    storage_path = f"{tile_id}/{date}/ndvi.tif"
    with open(ndvi_path, "rb") as f:
        supabase.storage.from_(BUCKET).upload(storage_path, f, {"upsert": "true"})

    payload = {
        "tile_id": tile_id,
        "country_id": country_id,
        "acquisition_date": date,
        "collection": "sentinel-2-l2a",
        "cloud_cover": scene.properties.get("eo:cloud_cover"),
        "ndvi_path": storage_path,
        "red_band_path": red_url,
        "nir_band_path": nir_url,
        "metadata": scene.to_dict(),
        "status": "completed",
    }
    supabase.table("satellite_tiles").upsert(payload, on_conflict=["tile_id", "acquisition_date", "collection"]).execute()

def run():
    country_id = get_country_id()
    tiles = get_mgrs_tiles(country_id, limit=50)
    if not tiles:
        print("⚠️ No tiles found")
        return

    stac = Client.open("https://planetarycomputer.microsoft.com/api/stac/v1")

    for t in tiles:
        tile_id = t["tile_id"]
        last_date = get_last_date(tile_id, country_id)

        search = stac.search(
            collections=["sentinel-2-l2a"],
            query={"s2:mgrs_tile": {"eq": tile_id}, "eo:cloud_cover": {"lt": CLOUD_COVER}},
            datetime=f"{last_date.date().isoformat()}/now"
        )
        items = list(search.get_items())
        if not items:
            print(f"❌ No new scenes for {tile_id}")
            continue

        items.sort(key=lambda x: x.properties["eo:cloud_cover"])
        scene = items[0]
        date = scene.properties["datetime"][:10]

        red_url = pc.sign(scene.assets["B04"].href)
        nir_url = pc.sign(scene.assets["B08"].href)

        with tempfile.TemporaryDirectory() as tmp:
            red = os.path.join(tmp, "red.tif")
            nir = os.path.join(tmp, "nir.tif")
            ndvi = os.path.join(tmp, "ndvi.tif")

            os.system(f"wget -q -O {red} '{red_url}'")
            os.system(f"wget -q -O {nir} '{nir_url}'")
            compute_ndvi(red, nir, ndvi)

            upload(tile_id, country_id, date, ndvi, red_url, nir_url, scene)

        print(f"✅ Stored NDVI for {tile_id} on {date}")

if __name__ == "__main__":
    run()
