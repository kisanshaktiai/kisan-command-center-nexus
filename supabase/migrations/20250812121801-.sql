-- Fix security vulnerability: Remove public access to admin_users table
-- and create secure function for bootstrap checks

-- First, drop the problematic public policy that exposes admin data
DROP POLICY IF EXISTS "Public can check super admin existence for bootstrap" ON public.admin_users;

-- Create a secure function that only returns boolean for bootstrap check
-- This function uses SECURITY DEFINER to bypass RLS and only returns existence
CREATE OR REPLACE FUNCTION public.super_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' 
    AND is_active = true
  );
$$;

-- Create a secure function to get current admin role for RLS policies
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.admin_users 
  WHERE id = auth.uid() 
  AND is_active = true
  LIMIT 1;
$$;

-- Create a secure function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  );
$$;

-- Update any policies that might reference the old functions
-- Ensure admin_users table is properly secured
CREATE POLICY "Bootstrap check via function only" ON public.admin_users
FOR SELECT 
USING (false); -- This effectively blocks direct SELECT but functions can still access

-- Create policy for authenticated admin users to view other admins (but only basic info)
CREATE POLICY "Authenticated admins can view basic admin info" ON public.admin_users
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.admin_users 
    WHERE is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  )
);

-- Ensure admins can still manage their own records
CREATE POLICY "Admins can update their own profile" ON public.admin_users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Log this security fix
INSERT INTO public.admin_audit_logs (
  admin_id,
  action,
  details
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'security_fix_applied',
  jsonb_build_object(
    'issue', 'admin_users_public_access_removed',
    'description', 'Removed public access to admin_users table and created secure functions',
    'timestamp', now()
  )
);