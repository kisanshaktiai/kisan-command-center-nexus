-- Create helper function to extract bbox from PostGIS geometry
-- This returns bbox as array [xmin, ymin, xmax, ymax]
CREATE OR REPLACE FUNCTION public.get_geometry_bbox(geom geometry)
RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  bbox box2d;
  result numeric[];
BEGIN
  -- Get the bounding box
  bbox := ST_Envelope(geom)::box2d;
  
  -- Extract coordinates and return as array
  result := ARRAY[
    ST_XMin(geom),  -- xmin (longitude)
    ST_YMin(geom),  -- ymin (latitude)
    ST_XMax(geom),  -- xmax (longitude)
    ST_YMax(geom)   -- ymax (latitude)
  ];
  
  RETURN result;
END;
$$;