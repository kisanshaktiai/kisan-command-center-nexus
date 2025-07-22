
-- First, let's create a function to safely extract user roles from JWT claims
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'user'
  );
$$;

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.get_user_role() IN ('super_admin', 'platform_admin', 'admin');
$$;

-- Add the super admin user with role in user_metadata
-- This will update the existing user's metadata to include the super_admin role
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "super_admin", "full_name": "Super Admin"}'::jsonb
WHERE email = 'kisanshaktiai@gmail.com';

-- Create a more comprehensive function for role-based access
CREATE OR REPLACE FUNCTION public.check_user_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN required_role = 'super_admin' THEN 
      COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super_admin'
    WHEN required_role = 'admin' THEN 
      COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('super_admin', 'platform_admin', 'admin')
    ELSE FALSE
  END;
$$;

-- Update RLS policies to use the new role-based system for critical tables
-- Update tenants table policy
DROP POLICY IF EXISTS "Admin users can manage all tenants" ON tenants;
CREATE POLICY "Admin users can manage all tenants"
ON tenants
FOR ALL
TO authenticated
USING (public.check_user_role('admin'))
WITH CHECK (public.check_user_role('admin'));

-- Update tenant_branding table policy  
DROP POLICY IF EXISTS "Admin users can manage tenant branding" ON tenant_branding;
CREATE POLICY "Admin users can manage tenant branding"
ON tenant_branding
FOR ALL
TO authenticated
USING (public.check_user_role('admin'))
WITH CHECK (public.check_user_role('admin'));

-- Update tenant_features table policy
DROP POLICY IF EXISTS "Admin users can manage tenant features" ON tenant_features;
CREATE POLICY "Admin users can manage tenant features"
ON tenant_features
FOR ALL
TO authenticated
USING (public.check_user_role('admin'))
WITH CHECK (public.check_user_role('admin'));
