-- Add missing column to satellite_tiles table
ALTER TABLE satellite_tiles 
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;

-- Add column for tracking actual download status
ALTER TABLE satellite_tiles
ADD COLUMN IF NOT EXISTS actual_download_status TEXT DEFAULT 'not_started' CHECK (actual_download_status IN ('not_started', 'downloading', 'downloaded', 'failed'));

-- Add columns for tracking real file URLs from Copernicus
ALTER TABLE satellite_tiles
ADD COLUMN IF NOT EXISTS copernicus_red_band_url TEXT;
ALTER TABLE satellite_tiles  
ADD COLUMN IF NOT EXISTS copernicus_nir_band_url TEXT;
ALTER TABLE satellite_tiles
ADD COLUMN IF NOT EXISTS copernicus_download_attempted_at TIMESTAMP WITH TIME ZONE;

-- Create index for processing status
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_processing_status 
ON satellite_tiles(status, actual_download_status);

-- Update existing records to reflect reality
UPDATE satellite_tiles 
SET 
  storage_verified = false,
  actual_download_status = 'not_started',
  red_band_path = NULL,
  nir_band_path = NULL,
  ndvi_path = NULL
WHERE red_band_path LIKE '%dummy%' OR storage_verified = false;