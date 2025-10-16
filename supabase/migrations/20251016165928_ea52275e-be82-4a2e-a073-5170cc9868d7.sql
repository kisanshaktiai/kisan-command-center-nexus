-- Function to update MGRS tiles when a land is created or updated
CREATE OR REPLACE FUNCTION public.update_tiles_for_land(p_land_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  land_geom geometry;
  land_json_geom jsonb;
BEGIN
  -- Get the land's geometry (try boundary first, fallback to boundary_polygon_old)
  SELECT 
    boundary,
    boundary_polygon_old
  INTO 
    land_geom,
    land_json_geom
  FROM public.lands
  WHERE id = p_land_id;

  -- If no geometry found, exit
  IF land_geom IS NULL AND land_json_geom IS NULL THEN
    RETURN;
  END IF;

  -- Convert JSON boundary to geometry if needed
  IF land_geom IS NULL AND land_json_geom IS NOT NULL THEN
    land_geom := ST_GeomFromGeoJSON(land_json_geom::text);
  END IF;

  -- Update all intersecting tiles
  UPDATE public.mgrs_tiles
  SET 
    is_agri = true,
    is_land_contain = true,
    last_land_check = now(),
    total_lands_count = COALESCE(total_lands_count, 0) + 1
  WHERE ST_Intersects(
    geojson_geometry,
    land_geom
  )
  AND NOT EXISTS (
    -- Prevent duplicate counting: only increment if this land hasn't been counted before
    SELECT 1 
    FROM public.land_tile_intersections lti
    WHERE lti.land_id = p_land_id 
    AND lti.tile_id = mgrs_tiles.tile_id
  );

  -- Track which tiles intersect with this land (for accurate counting)
  INSERT INTO public.land_tile_intersections (land_id, tile_id, created_at)
  SELECT 
    p_land_id,
    mt.tile_id,
    now()
  FROM public.mgrs_tiles mt
  WHERE ST_Intersects(mt.geojson_geometry, land_geom)
  ON CONFLICT (land_id, tile_id) DO NOTHING;

END;
$$;

-- Create tracking table for land-tile intersections (prevents duplicate counting)
CREATE TABLE IF NOT EXISTS public.land_tile_intersections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id uuid NOT NULL,
  tile_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(land_id, tile_id)
);

-- Enable RLS on tracking table
ALTER TABLE public.land_tile_intersections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tracking table
CREATE POLICY "Tenant users can view land-tile intersections"
ON public.land_tile_intersections
FOR SELECT
USING (
  land_id IN (
    SELECT id FROM public.lands 
    WHERE tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Trigger function to automatically update tiles when land is created or updated
CREATE OR REPLACE FUNCTION public.trigger_update_tiles_for_land()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the update function for the affected land
  PERFORM public.update_tiles_for_land(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on lands table for INSERT
DROP TRIGGER IF EXISTS on_land_insert_update_tiles ON public.lands;
CREATE TRIGGER on_land_insert_update_tiles
AFTER INSERT ON public.lands
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_tiles_for_land();

-- Create trigger on lands table for UPDATE (when boundary changes)
DROP TRIGGER IF EXISTS on_land_update_update_tiles ON public.lands;
CREATE TRIGGER on_land_update_update_tiles
AFTER UPDATE OF boundary, boundary_polygon_old ON public.lands
FOR EACH ROW
WHEN (
  NEW.boundary IS DISTINCT FROM OLD.boundary 
  OR NEW.boundary_polygon_old IS DISTINCT FROM OLD.boundary_polygon_old
)
EXECUTE FUNCTION public.trigger_update_tiles_for_land();