-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'satellite_tiles_tile_id_key'
  ) THEN
    ALTER TABLE public.satellite_tiles 
    ADD CONSTRAINT satellite_tiles_tile_id_key UNIQUE (tile_id);
  END IF;
END $$;

-- Initialize satellite_tiles from mgrs_tiles for agricultural tiles
INSERT INTO public.satellite_tiles (
  tile_id,
  mgrs_tile_id,
  status,
  data_source
)
SELECT 
  mt.tile_id,
  mt.id,
  'pending',
  'copernicus'
FROM public.mgrs_tiles mt
WHERE mt.is_agri = true
ON CONFLICT (tile_id) DO NOTHING;

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