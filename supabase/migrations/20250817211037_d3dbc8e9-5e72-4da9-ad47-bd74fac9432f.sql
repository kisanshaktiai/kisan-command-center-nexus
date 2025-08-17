
-- Create a function to ensure user-tenant relationship exists for super admins
CREATE OR REPLACE FUNCTION public.ensure_user_tenant_access(p_tenant_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_super_admin boolean := false;
  v_relationship_exists boolean := false;
BEGIN
  -- Check if user is super admin
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE id = p_user_id 
    AND role = 'super_admin' 
    AND is_active = true
  ) INTO v_is_super_admin;
  
  -- If not super admin, return false (they shouldn't have automatic access)
  IF NOT v_is_super_admin THEN
    RETURN false;
  END IF;
  
  -- Check if relationship already exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_tenants 
    WHERE user_id = p_user_id 
    AND tenant_id = p_tenant_id 
    AND is_active = true
  ) INTO v_relationship_exists;
  
  -- If relationship doesn't exist, create it for super admin
  IF NOT v_relationship_exists THEN
    INSERT INTO public.user_tenants (
      user_id, 
      tenant_id, 
      role, 
      is_active, 
      created_at, 
      updated_at,
      metadata
    ) VALUES (
      p_user_id,
      p_tenant_id,
      'super_admin',
      true,
      now(),
      now(),
      jsonb_build_object(
        'auto_created', true,
        'created_by_function', 'ensure_user_tenant_access',
        'created_at', now()
      )
    );
    
    -- Log the automatic relationship creation
    INSERT INTO public.admin_audit_logs (
      admin_id,
      action,
      details,
      created_at
    ) VALUES (
      p_user_id,
      'auto_user_tenant_relationship_created',
      jsonb_build_object(
        'tenant_id', p_tenant_id,
        'user_id', p_user_id,
        'reason', 'super_admin_auto_access'
      ),
      now()
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Update the tenants RLS policy to automatically create user-tenant relationships for super admins
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;

CREATE POLICY "Super admins can manage all tenants" ON public.tenants
FOR ALL
TO authenticated
USING (
  -- First ensure the user-tenant relationship exists, then check access
  public.ensure_user_tenant_access(id) AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
)
WITH CHECK (
  -- Same logic for inserts/updates
  public.ensure_user_tenant_access(id) AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Create an index on user_tenants for better performance
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_tenant_active 
ON public.user_tenants(user_id, tenant_id, is_active) 
WHERE is_active = true;
