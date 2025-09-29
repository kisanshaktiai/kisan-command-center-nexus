-- Fix satellite_tiles table schema and add missing constraints
-- Add unique constraint on tile_id and acquisition_date
ALTER TABLE public.satellite_tiles 
ADD CONSTRAINT satellite_tiles_tile_acquisition_unique 
UNIQUE (tile_id, acquisition_date);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_status ON public.satellite_tiles(status);
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_country_id ON public.satellite_tiles(country_id);
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_acquisition_date ON public.satellite_tiles(acquisition_date);
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_cloud_cover ON public.satellite_tiles(cloud_cover);
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_created_at ON public.satellite_tiles(created_at);

-- Enable real-time for satellite_tiles table
ALTER TABLE public.satellite_tiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.satellite_tiles;