
-- Add metadata column to user_tenants table
ALTER TABLE public.user_tenants 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add a comment to describe the column
COMMENT ON COLUMN public.user_tenants.metadata IS 'Additional metadata for user-tenant relationships, including creation context and other relevant information';
