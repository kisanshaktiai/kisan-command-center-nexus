
-- 1) Fix is_tenant_admin to use the correct enum labels from public.user_role
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  is_admin BOOLEAN := false;
BEGIN
  -- A user is a tenant admin if they are tenant_admin or tenant_owner on the tenant
  SELECT EXISTS(
    SELECT 1
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = _tenant_id
      AND ut.role IN ('tenant_admin'::user_role, 'tenant_owner'::user_role)
      AND ut.is_active = true
  ) INTO is_admin;

  RETURN is_admin;
END;
$function$;

-- 2) Ensure fast lookups of steps by workflow
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_workflow_id
  ON public.onboarding_steps(workflow_id);
