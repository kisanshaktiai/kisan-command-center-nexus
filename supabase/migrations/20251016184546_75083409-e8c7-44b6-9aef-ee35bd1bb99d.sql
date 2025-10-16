-- Update the update_tiles_for_land function to use correct tile_id references

DROP FUNCTION IF EXISTS public.update_tiles_for_land(uuid) CASCADE;

-- ===================================================
-- Function: update_tiles_for_land
-- Purpose: Automatically update MGRS tiles when a land is added or updated
-- Compatible with: mgrs_tiles (tile_id::text), land_tile_intersections (tile_id::text)
-- ===================================================

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
  -- ✅ Get land boundary and tenant_id
  SELECT boundary, tenant_id
  INTO v_land_boundary, v_tenant_id
  FROM public.lands
  WHERE id = p_land_id;

  -- ✅ If boundary is null, try legacy boundary_polygon_old (JSON)
  IF v_land_boundary IS NULL THEN
    BEGIN
      SELECT ST_GeogFromGeoJSON(boundary_polygon_old::text)
      INTO v_land_boundary
      FROM public.lands
      WHERE id = p_land_id
      AND boundary_polygon_old IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Invalid GeoJSON for land %: %', p_land_id, SQLERRM;
      RETURN;
    END;
  END IF;

  -- ✅ If still no valid geometry, exit
  IF v_land_boundary IS NULL THEN
    RAISE NOTICE '⚠️ No boundary found for land %', p_land_id;
    RETURN;
  END IF;

  -- ✅ Convert to geometry (SRID 4326)
  v_land_boundary_geom := ST_SetSRID(v_land_boundary::geometry, 4326);

  -- ✅ Update intersecting MGRS tiles
  UPDATE public.mgrs_tiles
  SET 
    is_agri = true,
    is_land_contain = true,
    last_land_check = now()
  WHERE ST_Intersects(geometry, v_land_boundary_geom);

  -- ✅ Record intersections, use tile_id (text)
  INSERT INTO public.land_tile_intersections (land_id, tile_id, created_at)
  SELECT 
    p_land_id,
    mt.tile_id,
    now()
  FROM public.mgrs_tiles mt
  WHERE ST_Intersects(mt.geometry, v_land_boundary_geom)
  ON CONFLICT (land_id, tile_id) DO NOTHING;

  -- ✅ Recalculate total land count for each affected tile
  UPDATE public.mgrs_tiles mt
  SET total_lands_count = (
    SELECT COUNT(DISTINCT lti.land_id)
    FROM public.land_tile_intersections lti
    WHERE lti.tile_id = mt.tile_id
  )
  WHERE mt.tile_id IN (
    SELECT tile_id 
    FROM public.land_tile_intersections 
    WHERE land_id = p_land_id
  );

  RAISE NOTICE '✅ Updated tiles for land %', p_land_id;
END;
$$;

COMMENT ON FUNCTION public.update_tiles_for_land(uuid) IS 'Updates mgrs_tiles when a land is added/updated. Uses tile_id (text) for references. The geojson_geometry column is for MPC API export, while geometry is for internal spatial queries.';