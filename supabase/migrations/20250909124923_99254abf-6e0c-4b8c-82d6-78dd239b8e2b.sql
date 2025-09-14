-- Fix the white_label_configs update trigger function
-- Drop the incorrect trigger function that's trying to set a non-existent version field
DROP FUNCTION IF EXISTS public.update_white_label_configs_updated_at() CASCADE;

-- Recreate the function correctly (without version field)
CREATE OR REPLACE FUNCTION public.update_white_label_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_white_label_configs_updated_at 
  BEFORE UPDATE ON public.white_label_configs 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_white_label_configs_updated_at();

-- Add comment to clarify the table structure
COMMENT ON TABLE public.white_label_configs IS 'White-label configuration for tenants. No version field is used - configurations are tracked by updated_at timestamp only.';