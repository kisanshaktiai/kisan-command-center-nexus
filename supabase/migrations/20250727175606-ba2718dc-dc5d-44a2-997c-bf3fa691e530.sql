
-- First, drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Platform admins can manage regular admins" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view their own record" ON public.admin_users;

-- Create a security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT role FROM public.admin_users 
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- Create a function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  );
$$;

-- Create a function to check if current user is platform admin
CREATE OR REPLACE FUNCTION public.is_current_user_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role = 'platform_admin'
  );
$$;

-- Create new RLS policies using the security definer functions
CREATE POLICY "Super admins can manage all admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_current_user_super_admin())
WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Platform admins can manage regular admins"
ON public.admin_users
FOR ALL
TO authenticated
USING (
  public.is_current_user_platform_admin() 
  AND role NOT IN ('super_admin', 'platform_admin')
)
WITH CHECK (
  public.is_current_user_platform_admin() 
  AND role NOT IN ('super_admin', 'platform_admin')
);

CREATE POLICY "Admins can view their own record"
ON public.admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Self-registration for super admin email"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid() 
  AND email = 'kisanshaktiai@gmail.com' 
  AND role = 'super_admin'
);

-- Update the existing is_super_admin function to use security definer
DROP FUNCTION IF EXISTS public.is_super_admin();
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  );
$$;

-- Update the existing is_authenticated_admin function to use security definer
DROP FUNCTION IF EXISTS public.is_authenticated_admin();
CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin', 'admin')
  );
$$;
