
-- Add settings column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Update the column to have a default value for existing records
UPDATE public.tenants SET settings = '{}'::jsonb WHERE settings IS NULL;
