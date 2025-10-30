-- Create function to get lands with GeoJSON boundary
CREATE OR REPLACE FUNCTION public.get_lands_with_geojson_boundary()
RETURNS TABLE (
  id uuid,
  name text,
  boundary jsonb,
  tenant_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    ST_AsGeoJSON(l.boundary)::jsonb as boundary,
    l.tenant_id
  FROM public.lands l
  WHERE l.boundary IS NOT NULL;
END;
$$;