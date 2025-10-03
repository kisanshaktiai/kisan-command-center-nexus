
-- Drop the old JSONB version of the function to resolve overloading conflict
DROP FUNCTION IF EXISTS public.find_mgrs_tile_for_land(jsonb);

-- Keep only the geometry version which is the correct one
-- (Already exists from previous migration, so no need to recreate)
