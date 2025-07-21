
-- Fix infinite recursion in admin_users RLS policies
-- First, drop the problematic policies that cause circular references
DROP POLICY IF EXISTS "Admin users can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "admin_users_delete" ON admin_users;
DROP POLICY IF EXISTS "admin_users_insert" ON admin_users;
DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
DROP POLICY IF EXISTS "admin_users_update" ON admin_users;

-- Create a security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin', 'admin')
  );
$$;

-- Create simplified, non-recursive RLS policies
CREATE POLICY "Super admins can manage all admin users"
ON admin_users
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- Allow users to insert themselves as admin (for initial setup)
CREATE POLICY "Users can insert themselves as admin"
ON admin_users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Allow users to view their own admin record
CREATE POLICY "Users can view their own admin record"
ON admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_current_user_admin());
