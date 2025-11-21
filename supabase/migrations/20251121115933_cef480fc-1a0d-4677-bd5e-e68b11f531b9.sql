-- Disable the legacy domain sync trigger since we're using the new three-domain structure
-- This trigger was causing unique constraint violations on subdomain column

DROP TRIGGER IF EXISTS trigger_sync_legacy_domain_columns ON public.tenants;

-- Drop the function as well since we no longer need it
DROP FUNCTION IF EXISTS public.sync_legacy_domain_columns();