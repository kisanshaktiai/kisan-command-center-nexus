
-- Fix the find_mgrs_tile_for_land function to handle geometry type correctly
CREATE OR REPLACE FUNCTION public.find_mgrs_tile_for_land(land_geom geometry)
RETURNS TABLE(id uuid, tile_id text, geometry jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.id,
    mt.tile_id,
    mt.geometry
  FROM public.mgrs_tiles mt
  WHERE ST_Contains(
    ST_GeomFromGeoJSON(mt.geometry::text),
    land_geom
  )
  LIMIT 1;
END;
$$;
