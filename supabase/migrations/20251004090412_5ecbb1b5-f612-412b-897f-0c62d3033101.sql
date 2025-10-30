-- Fix get_lands_by_tile function to use correct column names
DROP FUNCTION IF EXISTS public.get_lands_by_tile(TEXT);

CREATE FUNCTION public.get_lands_by_tile(p_tile_id TEXT)
RETURNS TABLE (
  land_id UUID,
  farmer_id UUID,
  tenant_id UUID,
  area_hectares NUMERIC,
  boundary JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.farmer_id,
    l.tenant_id,
    (l.area_acres * 0.404686)::NUMERIC as area_hectares, -- Convert acres to hectares
    ST_AsGeoJSON(l.boundary)::JSONB as boundary
  FROM public.lands l
  INNER JOIN public.mgrs_tiles mt ON ST_Intersects(
    l.boundary,
    mt.geometry
  )
  WHERE mt.tile_id = p_tile_id
  AND l.is_active = true;
END;
$$;