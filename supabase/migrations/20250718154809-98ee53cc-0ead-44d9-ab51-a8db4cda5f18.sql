-- Fix tenant creation RLS policies 
-- Drop existing policy that might be too restrictive
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated admins can create tenants" ON public.tenants;

-- Create more permissive policies for admin users
CREATE POLICY "Admin users can create and manage tenants" 
ON public.tenants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Ensure admin_users table allows INSERT for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON public.admin_users;

-- Create policy that allows users to insert themselves as admin
CREATE POLICY "Users can insert themselves as admin" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Create policy that allows admin users to manage all admin users
CREATE POLICY "Admin users can view all admin users" 
ON public.admin_users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users a 
    WHERE a.id = auth.uid() 
    AND a.is_active = true
  )
);

CREATE POLICY "Admin users can manage all admin users" 
ON public.admin_users 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users a 
    WHERE a.id = auth.uid() 
    AND a.role IN ('super_admin', 'platform_admin') 
    AND a.is_active = true
  )
);