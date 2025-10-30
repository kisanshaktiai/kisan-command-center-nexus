-- Create function to get MGRS tiles that intersect with at least one land boundary
-- This optimizes satellite tile processing by only fetching relevant tiles

CREATE OR REPLACE FUNCTION get_tiles_intersecting_lands()
RETURNS TABLE (
  id uuid,
  tile_id character varying,
  geometry geometry,
  is_agri boolean,
  total_lands_count integer,
  geojson_geometry jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    mt.id,
    mt.tile_id,
    mt.geometry,
    mt.is_agri,
    mt.total_lands_count,
    mt.geojson_geometry
  FROM mgrs_tiles mt
  WHERE EXISTS (
    SELECT 1
    FROM lands l
    WHERE l.boundary IS NOT NULL
    AND ST_Intersects(mt.geometry, l.boundary)
  )
  OR EXISTS (
    SELECT 1
    FROM lands l
    WHERE l.boundary_polygon_old IS NOT NULL
    AND mt.geometry IS NOT NULL
    AND ST_Intersects(
      mt.geometry,
      ST_GeomFromGeoJSON(l.boundary_polygon_old::text)
    )
  );
END;
$$;

-- Create function with tile_id filter parameter
CREATE OR REPLACE FUNCTION get_tiles_intersecting_lands(tile_ids text[])
RETURNS TABLE (
  id uuid,
  tile_id character varying,
  geometry geometry,
  is_agri boolean,
  total_lands_count integer,
  geojson_geometry jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    mt.id,
    mt.tile_id,
    mt.geometry,
    mt.is_agri,
    mt.total_lands_count,
    mt.geojson_geometry
  FROM mgrs_tiles mt
  WHERE (tile_ids IS NULL OR array_length(tile_ids, 1) IS NULL OR mt.tile_id = ANY(tile_ids))
  AND (
    EXISTS (
      SELECT 1
      FROM lands l
      WHERE l.boundary IS NOT NULL
      AND ST_Intersects(mt.geometry, l.boundary)
    )
    OR EXISTS (
      SELECT 1
      FROM lands l
      WHERE l.boundary_polygon_old IS NOT NULL
      AND mt.geometry IS NOT NULL
      AND ST_Intersects(
        mt.geometry,
        ST_GeomFromGeoJSON(l.boundary_polygon_old::text)
      )
    )
  );
END;
$$;