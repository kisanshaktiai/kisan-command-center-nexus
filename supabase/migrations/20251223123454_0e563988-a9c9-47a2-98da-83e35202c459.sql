-- Add update_policy column to app_versions table (NON-BREAKING, additive only)
-- min_supported_version and release_notes already exist in the table

ALTER TABLE public.app_versions 
ADD COLUMN IF NOT EXISTS update_policy TEXT DEFAULT 'OPTIONAL';

-- Add comment for documentation
COMMENT ON COLUMN public.app_versions.update_policy IS 'Update policy: OPTIONAL, RECOMMENDED, or FORCED';

-- Create index for faster lookups by app_key and is_current
CREATE INDEX IF NOT EXISTS idx_app_versions_current_lookup 
ON public.app_versions (app_key, is_current) 
WHERE is_current = true;