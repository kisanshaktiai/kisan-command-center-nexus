
-- Drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Service role can manage all user tenant relationships" ON public.user_tenants;

-- Create a security definer function to check if current user is a super admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() 
        AND is_active = true 
        AND role IN ('super_admin', 'platform_admin')
    );
END;
$$;

-- Create a security definer function to check if current user is tenant admin for a specific tenant
CREATE OR REPLACE FUNCTION public.is_user_tenant_admin(target_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = target_tenant_id
        AND ut.is_active = true
        AND ut.role IN ('tenant_admin', 'tenant_owner')
    );
END;
$$;

-- Create new RLS policies that avoid infinite recursion
CREATE POLICY "Service role access" 
ON public.user_tenants 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can manage their own tenant relationships" 
ON public.user_tenants 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can manage all tenant relationships" 
ON public.user_tenants 
FOR ALL 
TO authenticated
USING (public.is_current_user_super_admin())
WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Tenant admins can manage relationships in their tenant" 
ON public.user_tenants 
FOR ALL 
TO authenticated
USING (public.is_user_tenant_admin(tenant_id))
WITH CHECK (public.is_user_tenant_admin(tenant_id));
