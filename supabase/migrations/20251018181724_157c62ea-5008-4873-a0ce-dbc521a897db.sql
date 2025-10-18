-- Update find_mgrs_tile_for_land to use ST_Intersects instead of ST_Contains
-- This will find tiles that intersect with the land boundary, not just fully contain it
DROP FUNCTION IF EXISTS public.find_mgrs_tile_for_land(geometry);

CREATE OR REPLACE FUNCTION public.find_mgrs_tile_for_land(land_geom geometry)
RETURNS TABLE(id uuid, tile_id varchar, geometry geometry)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  land_centroid geometry;
  land_bounds box2d;
BEGIN
  -- Get land centroid and bounds for debugging
  land_centroid := ST_Centroid(land_geom);
  land_bounds := ST_Envelope(land_geom)::box2d;
  
  RAISE NOTICE 'Searching for MGRS tile - Land centroid: %, Bounds: %', 
    ST_AsText(land_centroid), land_bounds;
  
  -- First try: Find tiles that intersect with the land polygon
  RETURN QUERY
  SELECT 
    mt.id,
    mt.tile_id,
    mt.geometry
  FROM mgrs_tiles mt
  WHERE ST_Intersects(mt.geometry, land_geom)
  ORDER BY ST_Area(ST_Intersection(mt.geometry, land_geom)) DESC
  LIMIT 1;
  
  -- If no results, check if any tiles exist near the land
  IF NOT FOUND THEN
    RAISE NOTICE 'No intersecting tiles found. Checking for nearby tiles...';
    
    RETURN QUERY
    SELECT 
      mt.id,
      mt.tile_id,
      mt.geometry
    FROM mgrs_tiles mt
    ORDER BY ST_Distance(mt.geometry, land_centroid)
    LIMIT 1;
  END IF;
END;
$$;