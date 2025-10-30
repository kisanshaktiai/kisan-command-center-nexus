-- Add helper function to calculate area in km² from geometry
CREATE OR REPLACE FUNCTION public.calculate_area_km2(geom geometry)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Convert geometry to geography for accurate area calculation, then convert m² to km²
  RETURN ST_Area(geom::geography) / 1000000.0;
END;
$$;