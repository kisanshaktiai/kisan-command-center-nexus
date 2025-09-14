
-- Add created_by column to tenants table if it doesn't exist
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS created_by UUID 
REFERENCES auth.users(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Create index for performance on created_by lookups
CREATE INDEX IF NOT EXISTS idx_tenants_created_by 
ON public.tenants(created_by);

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.created_by IS 
'UUID of the auth.users record who created this tenant. Used for audit trail and tracking tenant ownership.';
