-- Fix get_tiles_with_lands() return type to match mgrs_tiles.tile_id type
DROP FUNCTION IF EXISTS public.get_tiles_with_lands();

CREATE FUNCTION public.get_tiles_with_lands()
RETURNS TABLE (
  tile_id character varying(6),
  agri_area_km2 NUMERIC,
  lands_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.tile_id,
    mt.agri_area_km2,
    mt.total_lands_count
  FROM public.mgrs_tiles mt
  WHERE mt.is_agri = true 
    AND mt.total_lands_count > 0
  ORDER BY mt.agri_area_km2 DESC;
END;
$$;