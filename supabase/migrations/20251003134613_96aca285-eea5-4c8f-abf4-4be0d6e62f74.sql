-- Drop the old mark_agricultural_tile function with TEXT parameter
-- There are two versions causing ambiguity, we need only the VARCHAR(6) version
DROP FUNCTION IF EXISTS public.mark_agricultural_tile(p_tile_id TEXT, p_land_area_km2 NUMERIC);