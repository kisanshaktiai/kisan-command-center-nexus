-- Add processing_stage field to satellite_tiles table
ALTER TABLE satellite_tiles 
ADD COLUMN IF NOT EXISTS processing_stage text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN satellite_tiles.processing_stage IS 'Current processing stage: downloading_red, downloading_nir, calculating_ndvi, uploading_red, uploading_nir, uploading_ndvi, verifying, completed';