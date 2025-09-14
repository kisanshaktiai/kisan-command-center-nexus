-- Fix security vulnerability: Remove public access to tenants table
-- and create secure access controls for tenant data

-- Drop any existing public policies on tenants table
DROP POLICY IF EXISTS "Public can read tenants" ON public.tenants;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tenants;
DROP POLICY IF EXISTS "Public access to tenants" ON public.tenants;

-- Create secure function to check if tenant exists by slug (for domain routing)
-- This only returns boolean, not sensitive data
CREATE OR REPLACE FUNCTION public.tenant_exists_by_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants 
    WHERE slug = p_slug 
    AND status = 'active'
  );
$$;

-- Create secure function to get basic tenant info by slug (minimal data for routing)
-- Only returns id, name, slug, status - no sensitive business info
CREATE OR REPLACE FUNCTION public.get_tenant_routing_info(p_slug text)
RETURNS TABLE(id uuid, name text, slug text, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT t.id, t.name, t.slug, t.status
  FROM public.tenants t
  WHERE t.slug = p_slug 
  AND t.status = 'active'
  LIMIT 1;
$$;

-- Super admins can view all tenant data
CREATE POLICY "Super admins can manage all tenants" ON public.tenants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Platform admins can view all tenants but with limited update access
CREATE POLICY "Platform admins can view all tenants" ON public.tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin') 
    AND is_active = true
  )
);

-- Tenant users can only access their own tenant data
CREATE POLICY "Tenant users can access their own tenant" ON public.tenants
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tenant_id FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Tenant admins can update their own tenant
CREATE POLICY "Tenant admins can update their own tenant" ON public.tenants
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT tenant_id FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('tenant_admin', 'tenant_owner')
  )
)
WITH CHECK (
  id IN (
    SELECT tenant_id FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('tenant_admin', 'tenant_owner')
  )
);

-- Log this security fix
INSERT INTO public.admin_audit_logs (
  admin_id,
  action,
  details
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'security_fix_applied',
  jsonb_build_object(
    'issue', 'tenants_table_public_access_removed',
    'description', 'Removed public access to tenants table and created secure access controls',
    'timestamp', now(),
    'affected_table', 'tenants'
  )
);