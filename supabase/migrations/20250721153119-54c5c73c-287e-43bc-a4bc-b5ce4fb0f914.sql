
-- Comprehensive fix for infinite recursion in admin_users RLS policies
-- Drop ALL existing policies that could cause conflicts
DROP POLICY IF EXISTS "Admin users can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Users can insert themselves as admin" ON admin_users;
DROP POLICY IF EXISTS "Users can view their own admin record" ON admin_users;
DROP POLICY IF EXISTS "admin_users_delete" ON admin_users;
DROP POLICY IF EXISTS "admin_users_insert" ON admin_users;
DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
DROP POLICY IF EXISTS "admin_users_update" ON admin_users;

-- Drop the existing function to recreate it
DROP FUNCTION IF EXISTS public.is_current_user_admin();

-- Create a completely isolated security definer function
CREATE OR REPLACE FUNCTION public.check_admin_status()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Direct query without any RLS interference
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin', 'admin')
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_admin_status() TO authenticated;

-- Create simple, non-recursive policies
CREATE POLICY "Admin access policy"
ON admin_users
FOR ALL
TO authenticated
USING (public.check_admin_status())
WITH CHECK (public.check_admin_status());

-- Allow initial admin setup
CREATE POLICY "Self insert policy"
ON admin_users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Allow viewing own record
CREATE POLICY "Self view policy"
ON admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.check_admin_status());
