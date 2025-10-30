-- Refactor for tile-first NDVI caching system (fixed)
-- Add agricultural area tracking and improve tile-land mapping

-- 1. Add agri_area_km2 to mgrs_tiles for ±20% tolerance matching
ALTER TABLE public.mgrs_tiles 
ADD COLUMN IF NOT EXISTS agri_area_km2 NUMERIC(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_lands_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_land_check TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.mgrs_tiles.agri_area_km2 IS 'Total agricultural land area in km² that overlaps with this tile (±20% tolerance)';
COMMENT ON COLUMN public.mgrs_tiles.total_lands_count IS 'Number of farmer lands overlapping this tile';
COMMENT ON COLUMN public.mgrs_tiles.last_land_check IS 'Last time agricultural lands were validated for this tile';

-- 2. Ensure satellite_tiles supports multiple acquisitions per tile
ALTER TABLE public.satellite_tiles 
DROP CONSTRAINT IF EXISTS satellite_tiles_tile_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_satellite_tiles_tile_acquisition 
ON public.satellite_tiles(tile_id, acquisition_date);

-- 3. Add NDVI numeric stats columns if missing
ALTER TABLE public.satellite_tiles
ADD COLUMN IF NOT EXISTS ndvi_mean NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS ndvi_min NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS ndvi_max NUMERIC(5, 4),
ADD COLUMN IF NOT EXISTS ndvi_std_dev NUMERIC(5, 4);

-- 4. Ensure default collection is SENTINEL-2
ALTER TABLE public.satellite_tiles 
ALTER COLUMN collection SET DEFAULT 'SENTINEL-2';

-- 5. Add last_checked timestamp for cache freshness
ALTER TABLE public.satellite_tiles
ADD COLUMN IF NOT EXISTS last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_satellite_tiles_last_checked 
ON public.satellite_tiles(last_checked DESC);

-- 6. Drop and recreate get_tiles_with_lands RPC
DROP FUNCTION IF EXISTS public.get_tiles_with_lands();

CREATE FUNCTION public.get_tiles_with_lands()
RETURNS TABLE (
  tile_id TEXT,
  agri_area_km2 NUMERIC,
  lands_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.tile_id,
    mt.agri_area_km2,
    mt.total_lands_count
  FROM public.mgrs_tiles mt
  WHERE mt.is_agri = true 
    AND mt.total_lands_count > 0
  ORDER BY mt.agri_area_km2 DESC;
END;
$$;

-- 7. Create function to mark agricultural tiles with area validation
CREATE OR REPLACE FUNCTION public.mark_agricultural_tile(
  p_tile_id TEXT,
  p_land_area_km2 NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tile_area_km2 NUMERIC;
  v_area_diff_percent NUMERIC;
BEGIN
  SELECT agri_area_km2 INTO v_tile_area_km2
  FROM public.mgrs_tiles
  WHERE tile_id = p_tile_id;
  
  IF v_tile_area_km2 > 0 THEN
    v_area_diff_percent := ABS((p_land_area_km2 - v_tile_area_km2) / v_tile_area_km2 * 100);
  ELSE
    v_area_diff_percent := 0;
  END IF;
  
  IF v_area_diff_percent <= 20 OR v_tile_area_km2 = 0 THEN
    UPDATE public.mgrs_tiles
    SET 
      is_agri = true,
      agri_area_km2 = COALESCE(agri_area_km2, 0) + p_land_area_km2,
      total_lands_count = COALESCE(total_lands_count, 0) + 1,
      last_land_check = NOW()
    WHERE tile_id = p_tile_id;
  END IF;
END;
$$;

-- 8. Drop and recreate get_lands_by_tile
DROP FUNCTION IF EXISTS public.get_lands_by_tile(TEXT);

CREATE FUNCTION public.get_lands_by_tile(p_tile_id TEXT)
RETURNS TABLE (
  land_id UUID,
  farmer_id UUID,
  tenant_id UUID,
  area_hectares NUMERIC,
  boundary JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.farmer_id,
    l.tenant_id,
    l.area,
    l.boundary
  FROM public.lands l
  INNER JOIN public.mgrs_tiles mt ON ST_Intersects(
    ST_GeomFromGeoJSON(l.boundary::text),
    ST_GeomFromGeoJSON(mt.geometry::text)
  )
  WHERE mt.tile_id = p_tile_id;
END;
$$;

-- 9. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_mgrs_tiles_agricultural 
ON public.mgrs_tiles(is_agri, agri_area_km2 DESC) 
WHERE is_agri = true;

CREATE INDEX IF NOT EXISTS idx_satellite_tiles_tile_status 
ON public.satellite_tiles(tile_id, status, last_checked DESC);

CREATE INDEX IF NOT EXISTS idx_ndvi_micro_tiles_land_date 
ON public.ndvi_micro_tiles(land_id, acquisition_date DESC);

-- 10. Add cache expiry to ndvi_micro_tiles (without NOW() in predicate)
ALTER TABLE public.ndvi_micro_tiles
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE 
  DEFAULT (NOW() + INTERVAL '7 days');

-- Simple index without predicate (predicate would require immutable function)
CREATE INDEX IF NOT EXISTS idx_ndvi_micro_tiles_expires 
ON public.ndvi_micro_tiles(expires_at);