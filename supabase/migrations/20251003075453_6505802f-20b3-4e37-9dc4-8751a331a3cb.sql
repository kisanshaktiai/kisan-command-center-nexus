-- Initialize satellite_tiles from mgrs_tiles for agricultural tiles
-- Use current date as initial acquisition_date
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

-- Log initialization
DO $$
DECLARE
  tile_count INTEGER;
  agri_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tile_count FROM public.satellite_tiles;
  SELECT COUNT(*) INTO agri_count FROM public.mgrs_tiles WHERE is_agri = true;
  RAISE NOTICE 'Initialized % satellite tiles from % agricultural MGRS tiles', tile_count, agri_count;
END $$;