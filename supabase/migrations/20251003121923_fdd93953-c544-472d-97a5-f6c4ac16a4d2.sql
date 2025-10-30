-- Create RPC function to get tiles that have lands
CREATE OR REPLACE FUNCTION get_tiles_with_lands()
RETURNS TABLE (tile_id text, land_count bigint) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    m.tile_id,
    COUNT(DISTINCT l.id) as land_count
  FROM mgrs_tiles m
  INNER JOIN lands l ON ST_Intersects(l.boundary, m.geometry)
  WHERE m.is_agri = true
  GROUP BY m.tile_id
  HAVING COUNT(DISTINCT l.id) > 0;
$$;