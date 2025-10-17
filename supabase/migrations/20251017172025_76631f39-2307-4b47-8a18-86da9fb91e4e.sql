-- Step 1: Truncate existing MGRS tiles data
TRUNCATE TABLE public.mgrs_tiles CASCADE;

-- Step 2: Add spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_mgrs_tiles_geometry ON public.mgrs_tiles USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_mgrs_tiles_tile_id ON public.mgrs_tiles (tile_id);
CREATE INDEX IF NOT EXISTS idx_mgrs_tiles_state_district ON public.mgrs_tiles (state, district);

-- Step 3: Add unique constraint on tile_id
ALTER TABLE public.mgrs_tiles DROP CONSTRAINT IF EXISTS unique_tile_id;
ALTER TABLE public.mgrs_tiles ADD CONSTRAINT unique_tile_id UNIQUE (tile_id);

-- Step 4: Create function to find intersecting states for a tile geometry
CREATE OR REPLACE FUNCTION public.find_intersecting_states(tile_geom geometry)
RETURNS TABLE (id uuid, name varchar, state_code varchar) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.state_code
  FROM public.states s
  WHERE ST_Intersects(s.boundary, tile_geom)
  ORDER BY ST_Area(ST_Intersection(s.boundary, tile_geom)) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create function to find intersecting districts for a tile geometry
CREATE OR REPLACE FUNCTION public.find_intersecting_districts(tile_geom geometry)
RETURNS TABLE (id uuid, name varchar, district_code varchar) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.name, d.district_code
  FROM public.districts d
  WHERE ST_Intersects(d.boundary, tile_geom)
  ORDER BY ST_Area(ST_Intersection(d.boundary, tile_geom)) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;