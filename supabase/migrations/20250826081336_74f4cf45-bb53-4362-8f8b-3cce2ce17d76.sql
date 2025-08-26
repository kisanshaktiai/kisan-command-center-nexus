
-- Add the missing updated_by column to the tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add an index for better performance on this column
CREATE INDEX IF NOT EXISTS idx_tenants_updated_by ON public.tenants(updated_by);

-- Update the column to allow the edge function to work properly
COMMENT ON COLUMN public.tenants.updated_by IS 'User ID of who last updated this tenant record';
