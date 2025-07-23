
-- Consolidate Admin System and Fix RLS Issues
-- This migration will resolve the super admin conflicts and establish a clear role hierarchy

-- Step 1: Ensure we have a clean admin_users table structure
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Update role enum to have clear hierarchy
DROP TYPE IF EXISTS admin_role CASCADE;
CREATE TYPE admin_role AS ENUM ('super_admin', 'platform_admin', 'tenant_admin', 'user');

-- Update admin_users table to use the new enum
ALTER TABLE public.admin_users 
ALTER COLUMN role TYPE admin_role USING role::admin_role;

-- Step 3: Create security definer functions for consistent admin checking
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = user_id 
    AND is_active = true 
    AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = user_id 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = user_id 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin', 'tenant_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS admin_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.admin_users 
  WHERE id = user_id AND is_active = true
  LIMIT 1;
$$;

-- Step 4: Update login security functions
CREATE OR REPLACE FUNCTION public.increment_failed_login(user_email TEXT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.admin_users 
  SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      account_locked_until = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 
        THEN now() + interval '30 minutes'
        ELSE account_locked_until
      END,
      updated_at = now()
  WHERE email = user_email;
$$;

CREATE OR REPLACE FUNCTION public.reset_failed_login(user_email TEXT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.admin_users 
  SET failed_login_attempts = 0,
      account_locked_until = NULL,
      last_login_at = now(),
      updated_at = now()
  WHERE email = user_email;
$$;

CREATE OR REPLACE FUNCTION public.is_account_locked(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(account_locked_until > now(), false)
  FROM public.admin_users 
  WHERE email = user_email;
$$;

-- Step 5: Drop all existing problematic RLS policies
DROP POLICY IF EXISTS "Admins can manage all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can insert themselves as admin" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can select their row" ON public.admin_users;

-- Step 6: Create new consolidated RLS policies
CREATE POLICY "Super admins can manage all admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can view own admin record"
ON public.admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "Users can update own admin record"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Step 7: Update other tables to use consolidated admin functions
-- Fix onboarding workflows
DROP POLICY IF EXISTS "super_admin_bypass" ON public.onboarding_workflows;
CREATE POLICY "Platform admins can manage onboarding workflows"
ON public.onboarding_workflows
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Fix onboarding steps
DROP POLICY IF EXISTS "super_admin_bypass" ON public.onboarding_steps;
CREATE POLICY "Platform admins can manage onboarding steps"
ON public.onboarding_steps
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Fix tenants table
DROP POLICY IF EXISTS "super_admin_bypass" ON public.tenants;
DROP POLICY IF EXISTS "Admin users can manage all tenants" ON public.tenants;
CREATE POLICY "Platform admins can manage tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Fix tenant_branding table
DROP POLICY IF EXISTS "super_admin_bypass" ON public.tenant_branding;
CREATE POLICY "Platform admins can manage tenant branding"
ON public.tenant_branding
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Fix tenant_features table
DROP POLICY IF EXISTS "super_admin_bypass" ON public.tenant_features;
CREATE POLICY "Platform admins can manage tenant features"
ON public.tenant_features
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Step 8: Ensure the current user has super admin access
INSERT INTO public.admin_users (
  id, 
  email, 
  full_name, 
  role, 
  is_active,
  created_at,
  updated_at
) VALUES (
  'afddb8de-bd12-4fa0-9a97-9c8de1085c99',
  'kisanshaktiai@gmail.com',
  'Super Admin',
  'super_admin',
  true,
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = now();

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_failed_login(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_failed_login(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_locked(TEXT) TO authenticated;

-- Step 10: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_role_active ON public.admin_users(role, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_failed_attempts ON public.admin_users(failed_login_attempts) WHERE failed_login_attempts > 0;
