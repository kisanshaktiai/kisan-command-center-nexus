-- Add resolution_level field to satellite_tiles table
ALTER TABLE satellite_tiles
ADD COLUMN IF NOT EXISTS resolution_level text DEFAULT 'thumbnail',
ADD COLUMN IF NOT EXISTS overview_ndvi_path text,
ADD COLUMN IF NOT EXISTS medium_ndvi_path text,
ADD COLUMN IF NOT EXISTS full_resolution_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS full_resolution_processed_at timestamp with time zone;

-- Add index for resolution queries
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_resolution ON satellite_tiles(resolution_level, status);

-- Add comments for documentation
COMMENT ON COLUMN satellite_tiles.resolution_level IS 'Processing resolution level: thumbnail (60m), medium (20m), or full (10m)';
COMMENT ON COLUMN satellite_tiles.overview_ndvi_path IS 'Path to low-resolution overview NDVI (60m)';
COMMENT ON COLUMN satellite_tiles.medium_ndvi_path IS 'Path to medium-resolution NDVI (20m)';
COMMENT ON COLUMN satellite_tiles.full_resolution_requested IS 'Whether full resolution processing has been requested';
COMMENT ON COLUMN satellite_tiles.full_resolution_processed_at IS 'Timestamp when full resolution was processed';