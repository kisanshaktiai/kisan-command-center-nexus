
-- Fix infinite recursion in admin_users RLS policies
-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Admin users can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;

-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  );
$$;

-- Create simpler, non-recursive RLS policies
CREATE POLICY "Admins can view admin users" ON admin_users
  FOR SELECT 
  USING (public.is_admin_user());

CREATE POLICY "Admins can manage admin users" ON admin_users
  FOR ALL 
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Ensure tenants table has proper RLS policies
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON tenants;
CREATE POLICY "Super admins can manage all tenants" ON tenants
  FOR ALL 
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Grant necessary permissions for the RPC function
GRANT EXECUTE ON FUNCTION public.create_tenant_with_validation TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user TO authenticated;
