-- Clean up and optimize MGRS tile update logic
-- Remove old functions and triggers related to tile-land updates

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_land_insert_update_tiles ON public.lands;
DROP TRIGGER IF EXISTS on_land_update_update_tiles ON public.lands;
DROP TRIGGER IF EXISTS trigger_update_tiles_on_land_insert ON public.lands;
DROP TRIGGER IF EXISTS trigger_update_tiles_on_land_update ON public.lands;

-- Drop old functions
DROP FUNCTION IF EXISTS public.trigger_update_tiles_for_land() CASCADE;
DROP FUNCTION IF EXISTS public.update_tiles_for_land(uuid) CASCADE;

-- Create optimized function to update tiles when land is added/updated
CREATE OR REPLACE FUNCTION public.update_tiles_for_land(p_land_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_land_boundary geography;
  v_land_boundary_geom geometry;
  v_tenant_id uuid;
BEGIN
  -- Get land boundary and tenant_id
  SELECT boundary, tenant_id
  INTO v_land_boundary, v_tenant_id
  FROM public.lands
  WHERE id = p_land_id;

  -- If boundary is null, try to convert from boundary_polygon_old (JSONB)
  IF v_land_boundary IS NULL THEN
    BEGIN
      SELECT ST_GeogFromGeoJSON((boundary_polygon_old->>'geometry')::text)
      INTO v_land_boundary
      FROM public.lands
      WHERE id = p_land_id
      AND boundary_polygon_old IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Invalid GeoJSON data for land %: %', p_land_id, SQLERRM;
      RETURN;
    END;
  END IF;

  -- If still no boundary, exit
  IF v_land_boundary IS NULL THEN
    RAISE NOTICE 'No boundary data found for land %', p_land_id;
    RETURN;
  END IF;

  -- Convert geography to geometry for PostGIS operations
  v_land_boundary_geom := v_land_boundary::geometry;

  -- Update intersecting tiles
  -- Use mgrs_tiles.geometry (PostGIS geometry type) for spatial intersection
  UPDATE public.mgrs_tiles
  SET 
    is_agri = true,
    is_land_contain = true,
    last_land_check = now()
  WHERE ST_Intersects(geometry, v_land_boundary_geom);

  -- Insert into land_tile_intersections (avoid duplicates)
  INSERT INTO public.land_tile_intersections (land_id, tile_id, created_at)
  SELECT 
    p_land_id,
    mt.id,
    now()
  FROM public.mgrs_tiles mt
  WHERE ST_Intersects(mt.geometry, v_land_boundary_geom)
  ON CONFLICT (land_id, tile_id) DO NOTHING;

  -- Recalculate total_lands_count for all affected tiles
  UPDATE public.mgrs_tiles mt
  SET total_lands_count = (
    SELECT COUNT(DISTINCT lti.land_id)
    FROM public.land_tile_intersections lti
    WHERE lti.tile_id = mt.id
  )
  WHERE id IN (
    SELECT tile_id 
    FROM public.land_tile_intersections 
    WHERE land_id = p_land_id
  );

END;
$$;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.trigger_update_tiles_for_land()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.update_tiles_for_land(NEW.id);
  RETURN NEW;
END;
$$;

-- Create triggers on lands table
CREATE TRIGGER on_land_insert_update_tiles
  AFTER INSERT ON public.lands
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_tiles_for_land();

CREATE TRIGGER on_land_update_update_tiles
  AFTER UPDATE OF boundary, boundary_polygon_old ON public.lands
  FOR EACH ROW
  WHEN (NEW.boundary IS DISTINCT FROM OLD.boundary OR NEW.boundary_polygon_old IS DISTINCT FROM OLD.boundary_polygon_old)
  EXECUTE FUNCTION public.trigger_update_tiles_for_land();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_land_tile_intersections_land_id ON public.land_tile_intersections(land_id);
CREATE INDEX IF NOT EXISTS idx_land_tile_intersections_tile_id ON public.land_tile_intersections(tile_id);
CREATE INDEX IF NOT EXISTS idx_mgrs_tiles_geometry ON public.mgrs_tiles USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_mgrs_tiles_agri_flags ON public.mgrs_tiles(is_agri, is_land_contain) WHERE is_agri = true;

COMMENT ON FUNCTION public.update_tiles_for_land(uuid) IS 'Updates mgrs_tiles when a land is added/updated. Uses geometry column for PostGIS spatial operations. The geojson_geometry column is for MPC API export, while geometry is for internal spatial queries.';
COMMENT ON FUNCTION public.trigger_update_tiles_for_land() IS 'Trigger function to automatically update tiles when lands are inserted or updated';