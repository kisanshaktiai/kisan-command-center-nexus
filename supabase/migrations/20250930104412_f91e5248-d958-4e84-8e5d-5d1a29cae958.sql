-- Add data quality fields to satellite_tiles table
ALTER TABLE public.satellite_tiles
ADD COLUMN IF NOT EXISTS data_quality_score NUMERIC(5,2) DEFAULT NULL CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
ADD COLUMN IF NOT EXISTS validation_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS band_statistics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]';

-- Add index for validation status
CREATE INDEX IF NOT EXISTS idx_satellite_tiles_validation_status 
ON public.satellite_tiles(validation_status, data_quality_score);

-- Add validation status enum constraint
ALTER TABLE public.satellite_tiles 
DROP CONSTRAINT IF EXISTS satellite_tiles_validation_status_check;

ALTER TABLE public.satellite_tiles 
ADD CONSTRAINT satellite_tiles_validation_status_check 
CHECK (validation_status IN ('pending', 'validating', 'passed', 'failed', 'warning'));