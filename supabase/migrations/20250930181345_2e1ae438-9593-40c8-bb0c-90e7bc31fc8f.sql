-- Add resolution tracking and improve status management for lightweight processing
ALTER TABLE satellite_tiles 
ADD COLUMN IF NOT EXISTS resolution VARCHAR(10) DEFAULT 'R60m',
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS data_source VARCHAR(20) DEFAULT 'metadata_only',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS bandwidth_usage_mb NUMERIC DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_resolution ON satellite_tiles(resolution);
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_data_source ON satellite_tiles(data_source);
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_status_date ON satellite_tiles(status, acquisition_date DESC);

-- Update existing tiles to reflect they're using high resolution (R10m)
UPDATE satellite_tiles 
SET resolution = 'R10m',
    data_source = CASE 
        WHEN red_band_path IS NOT NULL AND nir_band_path IS NOT NULL THEN 'downloaded'
        ELSE 'metadata_only'
    END
WHERE resolution IS NULL;

-- Create a simplified view for quick access to latest tiles
CREATE OR REPLACE VIEW latest_satellite_tiles AS
SELECT 
    tile_id,
    acquisition_date,
    cloud_cover,
    resolution,
    status,
    data_source,
    metadata->>'region' as region,
    metadata->>'thumbnail_url' as thumbnail,
    created_at
FROM satellite_tiles
WHERE acquisition_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY acquisition_date DESC;

-- Grant access to the view
GRANT SELECT ON latest_satellite_tiles TO authenticated;