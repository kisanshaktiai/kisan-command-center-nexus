-- Fix has_tenant_access function to allow super admins to view all tenants
-- This resolves the issue where super admins cannot see any tenants in the Tenant Management page

CREATE OR REPLACE FUNCTION public.has_tenant_access(check_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Service role always has access
  IF auth.role() = 'service_role' THEN
    RETURN true;
  END IF;
  
  -- Super admins and platform admins have access to all tenants
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if current tenant matches
  RETURN public.get_current_tenant_id() = check_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.has_tenant_access(uuid) IS 'Checks if the current user has access to a specific tenant. Returns true for service role, super admins, platform admins, or if the tenant matches the current tenant context.';