-- Temporarily disable RLS to populate satellite_tiles
ALTER TABLE satellite_tiles DISABLE ROW LEVEL SECURITY;

-- Initialize satellite_tiles from agricultural mgrs_tiles
INSERT INTO public.satellite_tiles (
  tile_id,
  mgrs_tile_id,
  status,
  data_source,
  acquisition_date,
  collection
)
SELECT 
  mt.tile_id,
  mt.id,
  'pending',
  'copernicus',
  CURRENT_DATE,
  'SENTINEL-2'
FROM public.mgrs_tiles mt
WHERE mt.is_agri = true
ON CONFLICT (tile_id, acquisition_date) DO NOTHING;

-- Re-enable RLS
ALTER TABLE satellite_tiles ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for satellite_tiles
CREATE POLICY "Super admins can manage satellite tiles"
ON satellite_tiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.role = 'super_admin'
    AND admin_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.role = 'super_admin'
    AND admin_users.is_active = true
  )
);

-- Log results
DO $$
DECLARE
  tile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tile_count FROM public.satellite_tiles;
  RAISE NOTICE 'Successfully initialized % satellite tiles', tile_count;
END $$;