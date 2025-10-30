-- Update mark_agricultural_tile function to set both is_agri and is_land_contain columns
CREATE OR REPLACE FUNCTION public.mark_agricultural_tile(
  p_tile_id VARCHAR(6),
  p_land_area_km2 NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.mgrs_tiles
  SET 
    is_agri = true,
    is_land_contain = true,
    total_lands_count = COALESCE(total_lands_count, 0) + 1,
    agri_area_km2 = COALESCE(agri_area_km2, 0) + p_land_area_km2,
    updated_at = now()
  WHERE tile_id = p_tile_id;
  
  -- Log if tile wasn't found
  IF NOT FOUND THEN
    RAISE NOTICE 'MGRS tile % not found', p_tile_id;
  END IF;
END;
$$;