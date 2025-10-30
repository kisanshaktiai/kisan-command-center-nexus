-- Phase 1: Tile-First NDVI Architecture - Database Schema Enhancement

-- 1.1 Add Missing Columns to satellite_tiles
ALTER TABLE satellite_tiles
ADD COLUMN IF NOT EXISTS last_checked TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ndvi_stats JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS bbox JSONB;

-- 1.2 Create Performance Indexes

-- Tile + date lookup (for checking if tile needs refresh)
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_tile_date 
ON satellite_tiles(tile_id, acquisition_date DESC);

-- Last checked for 24h cache logic
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_last_checked 
ON satellite_tiles(last_checked) 
WHERE status = 'ready';

-- Agricultural tiles filter
CREATE INDEX IF NOT EXISTS idx_mgrs_tiles_is_agri 
ON mgrs_tiles(is_agri) 
WHERE is_agri = true;

-- 1.3 Create Helper Function: get_lands_by_tile
CREATE OR REPLACE FUNCTION get_lands_by_tile(p_tile_id TEXT)
RETURNS TABLE (
  land_id UUID,
  farmer_id UUID,
  tenant_id UUID,
  land_name TEXT,
  area_acres NUMERIC,
  boundary_geojson JSONB
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
    l.name,
    l.area_acres,
    ST_AsGeoJSON(l.boundary)::jsonb
  FROM lands l
  INNER JOIN mgrs_tiles m ON ST_Intersects(l.boundary, m.geometry)
  WHERE m.tile_id = p_tile_id
    AND l.is_active = true
    AND l.boundary IS NOT NULL;
END;
$$;