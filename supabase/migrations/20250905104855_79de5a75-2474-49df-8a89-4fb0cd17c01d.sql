-- Add missing columns to tenants table for onboarding completion
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reactivated_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone DEFAULT NULL;

-- Create an index for quick lookup of active tenants
CREATE INDEX IF NOT EXISTS idx_tenants_status_activated 
ON public.tenants(status, activated_at) 
WHERE status = 'active';

-- Update existing active tenants to have activated_at if they don't have it
UPDATE public.tenants 
SET activated_at = COALESCE(activated_at, created_at)
WHERE status = 'active' AND activated_at IS NULL;