-- Add foreign key relationship between satellite_tiles and mgrs_tiles

-- Add mgrs_tile_id column to satellite_tiles
ALTER TABLE satellite_tiles 
ADD COLUMN IF NOT EXISTS mgrs_tile_id UUID REFERENCES mgrs_tiles(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_mgrs_tile_id ON satellite_tiles(mgrs_tile_id);

-- Create index on tile_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_tile_id ON satellite_tiles(tile_id);

-- Add comment
COMMENT ON COLUMN satellite_tiles.mgrs_tile_id IS 'Foreign key reference to mgrs_tiles table for linking NDVI data to MGRS grid';