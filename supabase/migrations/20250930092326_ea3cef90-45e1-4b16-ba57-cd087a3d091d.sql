-- Add individual file verification and checksum fields to satellite_tiles table
ALTER TABLE satellite_tiles 
ADD COLUMN IF NOT EXISTS red_band_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS red_band_size_bytes bigint,
ADD COLUMN IF NOT EXISTS red_band_checksum text,
ADD COLUMN IF NOT EXISTS nir_band_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nir_band_size_bytes bigint,
ADD COLUMN IF NOT EXISTS nir_band_checksum text,
ADD COLUMN IF NOT EXISTS ndvi_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ndvi_size_bytes bigint,
ADD COLUMN IF NOT EXISTS ndvi_checksum text,
ADD COLUMN IF NOT EXISTS last_verification_at timestamp with time zone;

-- Add comments for documentation
COMMENT ON COLUMN satellite_tiles.red_band_verified IS 'Whether RED band file exists and is valid';
COMMENT ON COLUMN satellite_tiles.red_band_size_bytes IS 'Size of RED band file in bytes';
COMMENT ON COLUMN satellite_tiles.red_band_checksum IS 'SHA-256 checksum of RED band file';
COMMENT ON COLUMN satellite_tiles.nir_band_verified IS 'Whether NIR band file exists and is valid';
COMMENT ON COLUMN satellite_tiles.nir_band_size_bytes IS 'Size of NIR band file in bytes';
COMMENT ON COLUMN satellite_tiles.nir_band_checksum IS 'SHA-256 checksum of NIR band file';
COMMENT ON COLUMN satellite_tiles.ndvi_verified IS 'Whether NDVI file exists and is valid';
COMMENT ON COLUMN satellite_tiles.ndvi_size_bytes IS 'Size of NDVI file in bytes';
COMMENT ON COLUMN satellite_tiles.ndvi_checksum IS 'SHA-256 checksum of NDVI file';
COMMENT ON COLUMN satellite_tiles.last_verification_at IS 'Timestamp of last storage verification';