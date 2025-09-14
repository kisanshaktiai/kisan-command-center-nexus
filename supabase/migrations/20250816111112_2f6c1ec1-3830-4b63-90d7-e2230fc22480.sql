
-- First, let's create proper security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
AS $$
  SELECT role FROM public.admin_users 
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_super_admin_count()
RETURNS INTEGER 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.admin_users 
  WHERE role = 'super_admin' AND is_active = true;
$$;

-- Drop all existing problematic policies on admin_users
DROP POLICY IF EXISTS "Admin invite acceptance" ON public.admin_users;
DROP POLICY IF EXISTS "Admin management access" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view their own record" ON public.admin_users;
DROP POLICY IF EXISTS "Authenticated admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Bootstrap super admin creation" ON public.admin_users;
DROP POLICY IF EXISTS "Bootstrap super admin creation allowed" ON public.admin_users;
DROP POLICY IF EXISTS "Bootstrap super admin registration" ON public.admin_users;
DROP POLICY IF EXISTS "Platform admins can manage regular admins" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON public.admin_users;

-- Create clean, non-recursive RLS policies for admin_users
CREATE POLICY "Allow bootstrap super admin creation" 
ON public.admin_users FOR INSERT 
WITH CHECK (
  auth.uid() = id 
  AND role = 'super_admin' 
  AND public.get_super_admin_count() = 0
);

CREATE POLICY "Allow self management" 
ON public.admin_users FOR ALL 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Super admins can manage all" 
ON public.admin_users FOR ALL 
USING (public.is_current_user_super_admin())
WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Admins can view other admins" 
ON public.admin_users FOR SELECT 
USING (
  public.get_current_admin_role() IN ('super_admin', 'platform_admin', 'admin')
);

-- Fix system_config policies to allow bootstrap completion
DROP POLICY IF EXISTS "Super admins can manage system config" ON public.system_config;
DROP POLICY IF EXISTS "Allow bootstrap completion" ON public.system_config;

CREATE POLICY "Allow bootstrap operations" 
ON public.system_config FOR ALL 
USING (
  config_key = 'bootstrap_completed' OR 
  public.is_current_user_super_admin()
)
WITH CHECK (
  config_key = 'bootstrap_completed' OR 
  public.is_current_user_super_admin()
);

-- Enhanced bootstrap completion function
CREATE OR REPLACE FUNCTION public.complete_bootstrap_safely()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  super_admin_count INTEGER;
  result JSONB;
BEGIN
  -- Check if we have super admins
  SELECT COUNT(*) INTO super_admin_count 
  FROM public.admin_users 
  WHERE role = 'super_admin' AND is_active = true;
  
  IF super_admin_count > 0 THEN
    -- Mark bootstrap as completed
    INSERT INTO public.system_config (config_key, config_value, created_at, updated_at)
    VALUES ('bootstrap_completed', 'true', now(), now())
    ON CONFLICT (config_key) 
    DO UPDATE SET 
      config_value = 'true',
      updated_at = now();
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Bootstrap completed successfully',
      'super_admin_count', super_admin_count
    );
  ELSE
    -- Reset bootstrap to incomplete
    INSERT INTO public.system_config (config_key, config_value, created_at, updated_at)
    VALUES ('bootstrap_completed', 'false', now(), now())
    ON CONFLICT (config_key) 
    DO UPDATE SET 
      config_value = 'false',
      updated_at = now();
    
    result := jsonb_build_object(
      'success', false,
      'message', 'No super admin found, bootstrap incomplete',
      'super_admin_count', 0
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Enhanced bootstrap status check
CREATE OR REPLACE FUNCTION public.get_bootstrap_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_completed BOOLEAN := false;
  super_admin_count INTEGER := 0;
  result JSONB;
BEGIN
  -- Get config status
  SELECT COALESCE((config_value::text)::boolean, false)
  INTO config_completed
  FROM public.system_config 
  WHERE config_key = 'bootstrap_completed';
  
  -- Get super admin count
  SELECT COUNT(*) INTO super_admin_count
  FROM public.admin_users 
  WHERE role = 'super_admin' AND is_active = true;
  
  -- Determine actual status
  IF super_admin_count > 0 AND config_completed THEN
    result := jsonb_build_object(
      'completed', true,
      'needs_bootstrap', false,
      'super_admin_count', super_admin_count,
      'config_completed', config_completed,
      'status', 'ready'
    );
  ELSIF super_admin_count > 0 AND NOT config_completed THEN
    -- Fix inconsistent state
    UPDATE public.system_config 
    SET config_value = 'true', updated_at = now()
    WHERE config_key = 'bootstrap_completed';
    
    result := jsonb_build_object(
      'completed', true,
      'needs_bootstrap', false,
      'super_admin_count', super_admin_count,
      'config_completed', true,
      'status', 'fixed_inconsistency'
    );
  ELSE
    -- Need bootstrap
    result := jsonb_build_object(
      'completed', false,
      'needs_bootstrap', true,
      'super_admin_count', super_admin_count,
      'config_completed', config_completed,
      'status', 'needs_bootstrap'
    );
  END IF;
  
  RETURN result;
END;
$$;
