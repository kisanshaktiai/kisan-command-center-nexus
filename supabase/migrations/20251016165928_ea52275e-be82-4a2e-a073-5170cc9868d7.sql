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

  -- Exit if no geometry found
  IF land_geom IS NULL AND land_json_geom IS NULL THEN
    RETURN;
  END IF;

  -- Convert JSON boundary to geometry if needed
  IF land_geom IS NULL AND land_json_geom IS NOT NULL THEN
    land_geom := ST_GeomFromGeoJSON(land_json_geom::text);
  END IF;

  -- Update tiles that intersect this land
  UPDATE public.mgrs_tiles mt
  SET 
    is_agri = true,
    is_land_contain = true,
    last_land_check = now()
  WHERE ST_Intersects(
    ST_GeomFromGeoJSON(mt.geojson_geometry::text),
    land_geom
  );

  -- Insert new land-tile relationships (avoid duplicates)
  INSERT INTO public.land_tile_intersections (land_id, tile_id, created_at)
  SELECT 
    p_land_id,
    mt.tile_id,
    now()
  FROM public.mgrs_tiles mt
  WHERE ST_Intersects(
    ST_GeomFromGeoJSON(mt.geojson_geometry::text),
    land_geom
  )
  ON CONFLICT (land_id, tile_id) DO NOTHING;

  -- Recalculate total_lands_count accurately for all affected tiles
  UPDATE public.mgrs_tiles mt
  SET total_lands_count = (
    SELECT COUNT(*)
    FROM public.land_tile_intersections lti
    WHERE lti.tile_id = mt.tile_id
  )
  WHERE mt.tile_id IN (
    SELECT tile_id FROM public.land_tile_intersections WHERE land_id = p_land_id
  );

END;
$$;
