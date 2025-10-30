-- Create function to find which MGRS tile contains a land polygon
CREATE OR REPLACE FUNCTION public.find_mgrs_tile_for_land(land_geom jsonb)
RETURNS TABLE(id uuid, tile_id text, geometry jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    ST_GeomFromGeoJSON(land_geom::text)
  )
  LIMIT 1;
END;
$$;