-- Fix critical security vulnerability in admin_users table
-- Remove overly permissive public SELECT policy and create secure bootstrap check

-- First, drop the insecure public policy that exposes admin data
DROP POLICY IF EXISTS "Public can check super admin existence for bootstrap" ON public.admin_users;

-- Create a secure function to check bootstrap status without exposing admin data
CREATE OR REPLACE FUNCTION public.check_bootstrap_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_super_admin boolean;
  bootstrap_completed boolean;
BEGIN
  -- Check if any super admin exists without exposing their data
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  ) INTO has_super_admin;
  
  -- Check system config for bootstrap completion
  SELECT COALESCE((config_value::text)::boolean, false)
  FROM public.system_config 
  WHERE config_key = 'bootstrap_completed'
  INTO bootstrap_completed;
  
  RETURN jsonb_build_object(
    'has_super_admin', has_super_admin,
    'bootstrap_completed', COALESCE(bootstrap_completed, false),
    'requires_bootstrap', NOT has_super_admin AND NOT COALESCE(bootstrap_completed, false)
  );
END;
$$;

-- Grant public access to the secure bootstrap check function
GRANT EXECUTE ON FUNCTION public.check_bootstrap_status() TO anon, authenticated;

-- Create more restrictive policies for admin_users table
-- Only authenticated admin users can view admin records
CREATE POLICY "Authenticated admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  -- User can view their own record
  id = auth.uid() 
  OR 
  -- Or if they are an authenticated admin (super_admin, platform_admin, admin)
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.id = auth.uid() 
    AND au.is_active = true 
    AND au.role IN ('super_admin', 'platform_admin', 'admin')
  )
);

-- Update bootstrap-related policies to be more specific
-- Allow bootstrap super admin creation only when no super admin exists
CREATE POLICY "Bootstrap super admin creation allowed"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow super_admin creation during bootstrap
  role = 'super_admin' 
  AND auth.uid() = id
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  )
);

-- Allow authenticated users to insert their own admin record during invite acceptance
CREATE POLICY "Admin invite acceptance"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can create their own admin record if they have a valid invite
  auth.uid() = id
  AND (
    -- During bootstrap (no super admin exists)
    NOT EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE role = 'super_admin' AND is_active = true
    )
    OR
    -- Or if they have a pending admin invite
    EXISTS (
      SELECT 1 FROM public.admin_invites ai
      WHERE ai.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND ai.status = 'pending'
      AND ai.expires_at > now()
    )
    OR
    -- Or if they have a valid registration token
    EXISTS (
      SELECT 1 FROM public.admin_registration_tokens art
      WHERE art.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND art.expires_at > now()
      AND art.used_at IS NULL
    )
  )
);

-- Create audit logging for admin user access
CREATE OR REPLACE FUNCTION public.log_admin_user_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log when admin user data is accessed
  IF TG_OP = 'SELECT' THEN
    INSERT INTO public.admin_audit_logs (
      admin_id,
      action,
      details,
      created_at
    ) VALUES (
      auth.uid(),
      'admin_user_viewed',
      jsonb_build_object(
        'viewed_user_id', NEW.id,
        'viewed_user_email', NEW.email,
        'viewed_user_role', NEW.role
      ),
      now()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Note: We cannot create SELECT triggers in PostgreSQL, so we'll rely on application-level logging

-- Add comment to document the security fix
COMMENT ON TABLE public.admin_users IS 'Admin users table with secure RLS policies. Access restricted to authenticated admins only. Bootstrap status should be checked via check_bootstrap_status() function.';

-- Ensure all admin-related functions use proper security
-- Update existing functions to use the new secure bootstrap check
CREATE OR REPLACE FUNCTION public.is_bootstrap_required()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  ) AND NOT COALESCE(
    (SELECT (config_value::text)::boolean 
     FROM public.system_config 
     WHERE config_key = 'bootstrap_completed'), 
    false
  );
$$;

-- Grant execute to public for bootstrap check
GRANT EXECUTE ON FUNCTION public.is_bootstrap_required() TO anon, authenticated;