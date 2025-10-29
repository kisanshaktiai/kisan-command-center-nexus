-- Fix auto_mark_agricultural_tiles_on_land_change trigger to use boundary_geom (geometry)
-- Issue: Function was using boundary (geography) which caused type mismatches with mgrs_tiles.geometry

CREATE OR REPLACE FUNCTION public.auto_mark_agricultural_tiles_on_land_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tile_record RECORD;
  v_land_area_km2 NUMERIC;
BEGIN
  -- Use boundary_geom (geometry type) instead of boundary (geography type)
  IF NEW.boundary_geom IS NOT NULL THEN
    -- Calculate area from boundary_geom (transform to 4326 then to geography for accurate area)
    SELECT ST_Area(ST_Transform(NEW.boundary_geom, 4326)::geography) / 1000000.0 
    INTO v_land_area_km2;

    RAISE NOTICE 'Processing land % with area %.2f km²', NEW.id, v_land_area_km2;

    -- Find intersecting MGRS tiles (both are geometry type now - no casting needed)
    FOR v_tile_record IN
      SELECT id, tile_id, geometry
      FROM mgrs_tiles
      WHERE ST_Intersects(geometry, NEW.boundary_geom)
    LOOP
      -- Mark each intersecting tile as agricultural
      PERFORM mark_agricultural_tile(v_tile_record.tile_id, v_land_area_km2);
      
      RAISE NOTICE 'Auto-marked tile % for land % (area: %.2f km²)',
        v_tile_record.tile_id, NEW.id, v_land_area_km2;
    END LOOP;

    -- Log if no tiles were found (debugging)
    IF NOT FOUND THEN
      RAISE WARNING 'No intersecting MGRS tiles found for land % at boundary_geom', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger to watch boundary_geom column instead of boundary
DROP TRIGGER IF EXISTS trigger_auto_mark_agricultural_tiles ON public.lands;
CREATE TRIGGER trigger_auto_mark_agricultural_tiles
  AFTER INSERT OR UPDATE OF boundary_geom
  ON public.lands
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_mark_agricultural_tiles_on_land_change();

COMMENT ON FUNCTION public.auto_mark_agricultural_tiles_on_land_change() IS
  'Automatically marks MGRS tiles as agricultural when land records with boundary_geom are inserted or updated. Uses geometry type for proper spatial intersection.';