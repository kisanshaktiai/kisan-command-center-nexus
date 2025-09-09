-- Drop any existing functions that might be causing version field issues
DROP FUNCTION IF EXISTS public.increment_branding_version() CASCADE;
DROP FUNCTION IF EXISTS public.update_tenant_branding_version() CASCADE;

-- Ensure white_label_configs table doesn't have any triggers that reference a version field
DROP TRIGGER IF EXISTS increment_version_trigger ON public.white_label_configs;
DROP TRIGGER IF EXISTS update_branding_version_trigger ON public.white_label_configs;

-- Add comment to clarify the table structure
COMMENT ON TABLE public.white_label_configs IS 'White-label configuration for tenants. No version field is used - configurations are tracked by updated_at timestamp only.';