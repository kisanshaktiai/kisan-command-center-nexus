-- Drop the existing function with incorrect return types
DROP FUNCTION IF EXISTS public.find_mgrs_tile_for_land(geometry);

-- Create the function with correct return types matching the actual table columns
CREATE OR REPLACE FUNCTION public.find_mgrs_tile_for_land(land_geom geometry)
RETURNS TABLE(id uuid, tile_id varchar, geometry geometry)
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
  FROM mgrs_tiles mt
  WHERE ST_Contains(mt.geometry, land_geom)
  LIMIT 1;
END;
$$;