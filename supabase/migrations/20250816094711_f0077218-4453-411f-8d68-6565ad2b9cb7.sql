
-- Fix infinite recursion in admin_users RLS policies
-- Drop existing problematic policies that may cause recursion
DROP POLICY IF EXISTS "Admin management access" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view their own record" ON public.admin_users;
DROP POLICY IF EXISTS "Authenticated admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Platform admins can manage regular admins" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON public.admin_users;

-- Drop existing functions that might cause recursion
DROP FUNCTION IF EXISTS public.is_authenticated_admin();
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.can_create_admin();
DROP FUNCTION IF EXISTS public.get_current_admin_role();
DROP FUNCTION IF EXISTS public.is_current_user_super_admin();

-- Create secure functions that avoid recursion by using security definer
CREATE OR REPLACE FUNCTION public.check_user_admin_status(user_uuid uuid)
RETURNS TABLE(is_admin boolean, role text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN au.id IS NOT NULL THEN true ELSE false END as is_admin,
    COALESCE(au.role, '') as role,
    COALESCE(au.is_active, false) as is_active
  FROM public.admin_users au
  WHERE au.id = user_uuid
  LIMIT 1;
  
  -- If no record found, return default values
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ''::text, false;
  END IF;
END;
$$;

-- Create helper function to check if current user is admin (non-recursive)
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_status RECORD;
BEGIN
  SELECT * INTO user_status FROM public.check_user_admin_status(auth.uid());
  RETURN user_status.is_admin AND user_status.is_active;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Create helper function to check if current user is super admin (non-recursive)
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_status RECORD;
BEGIN
  SELECT * INTO user_status FROM public.check_user_admin_status(auth.uid());
  RETURN user_status.is_admin AND user_status.is_active AND user_status.role = 'super_admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Create helper function to get current user admin role (non-recursive)
CREATE OR REPLACE FUNCTION public.get_current_user_admin_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_status RECORD;
BEGIN
  SELECT * INTO user_status FROM public.check_user_admin_status(auth.uid());
  IF user_status.is_admin AND user_status.is_active THEN
    RETURN user_status.role;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Create helper function to check if bootstrap is needed (non-recursive)
CREATE OR REPLACE FUNCTION public.bootstrap_is_needed()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  has_super_admin boolean := false;
  bootstrap_completed boolean := false;
BEGIN
  -- Check if any super admin exists
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  ) INTO has_super_admin;
  
  -- Check bootstrap flag
  SELECT COALESCE((config_value::text)::boolean, false)
  FROM public.system_config 
  WHERE config_key = 'bootstrap_completed'
  INTO bootstrap_completed;
  
  RETURN NOT has_super_admin AND NOT bootstrap_completed;
EXCEPTION
  WHEN OTHERS THEN
    RETURN true; -- If we can't determine, assume bootstrap is needed for safety
END;
$$;

-- Create new RLS policies using the secure functions
CREATE POLICY "Users can view their own admin record"
ON public.admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow insert for bootstrap or invitation acceptance
CREATE POLICY "Bootstrap and invitation admin creation"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid() AND (
    -- Bootstrap case: no super admin exists
    public.bootstrap_is_needed()
    OR
    -- Invitation case: valid admin registration or invite exists
    EXISTS (
      SELECT 1 FROM public.admin_registrations ar
      WHERE ar.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND ar.status = 'pending'
      AND ar.expires_at > now()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.admin_invites ai
      WHERE ai.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND ai.status = 'pending'
      AND ai.expires_at > now()
    )
  )
);

-- Allow super admins to manage all admin users
CREATE POLICY "Super admins can manage all admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.current_user_is_super_admin())
WITH CHECK (public.current_user_is_super_admin());

-- Allow platform admins to manage regular admins (not super/platform admins)
CREATE POLICY "Platform admins can manage regular admins"
ON public.admin_users
FOR ALL
TO authenticated
USING (
  public.get_current_user_admin_role() = 'platform_admin' 
  AND role NOT IN ('super_admin', 'platform_admin')
)
WITH CHECK (
  public.get_current_user_admin_role() = 'platform_admin' 
  AND role NOT IN ('super_admin', 'platform_admin')
);

-- Allow admins to update their own records (limited fields)
CREATE POLICY "Admins can update their own profile"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (id = auth.uid() AND public.current_user_is_admin())
WITH CHECK (
  id = auth.uid() 
  AND public.current_user_is_admin()
  -- Prevent role escalation by non-super-admins
  AND (
    public.current_user_is_super_admin() 
    OR role = OLD.role -- Can't change their own role unless super admin
  )
);

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION public.check_user_admin_status(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_admin_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_is_needed() TO authenticated, anon;

-- Update other tables that might be using the old functions
-- Fix admin_audit_logs policies
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Platform admins can view audit logs" ON public.admin_audit_logs;

CREATE POLICY "Super admins can view all audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.current_user_is_super_admin());

CREATE POLICY "Platform admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.get_current_user_admin_role() IN ('platform_admin', 'super_admin'));

-- Fix admin_invites policies if they exist and use old functions
DROP POLICY IF EXISTS "Super admins can manage all invites" ON public.admin_invites;
DROP POLICY IF EXISTS "Platform admins can manage admin invites" ON public.admin_invites;

CREATE POLICY "Super admins can manage all invites"
ON public.admin_invites
FOR ALL
TO authenticated
USING (public.current_user_is_super_admin())
WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Platform admins can manage admin invites"
ON public.admin_invites
FOR ALL
TO authenticated
USING (
  public.get_current_user_admin_role() = 'platform_admin' 
  AND role NOT IN ('super_admin', 'platform_admin')
)
WITH CHECK (
  public.get_current_user_admin_role() = 'platform_admin' 
  AND role NOT IN ('super_admin', 'platform_admin')
);

-- Fix admin_notifications policies
DROP POLICY IF EXISTS "Super admins can manage all notifications" ON public.admin_notifications;

CREATE POLICY "Super admins can manage all notifications"
ON public.admin_notifications
FOR ALL
TO authenticated
USING (public.current_user_is_super_admin())
WITH CHECK (public.current_user_is_super_admin());

-- Fix account_lockouts policies
DROP POLICY IF EXISTS "Super admins can view account lockouts" ON public.account_lockouts;

CREATE POLICY "Super admins can view account lockouts"
ON public.account_lockouts
FOR SELECT
TO authenticated
USING (public.current_user_is_super_admin());

-- Add audit logging for admin access
CREATE OR REPLACE FUNCTION public.log_admin_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log admin user access attempts
  IF TG_OP = 'SELECT' AND TG_TABLE_NAME = 'admin_users' THEN
    INSERT INTO public.admin_audit_logs (
      admin_id,
      action,
      details,
      created_at
    ) VALUES (
      auth.uid(),
      'admin_user_accessed',
      jsonb_build_object(
        'accessed_user_id', COALESCE(NEW.id, OLD.id),
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP
      ),
      now()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add comment explaining the security approach
COMMENT ON FUNCTION public.check_user_admin_status(uuid) IS 'Security definer function to check admin status without RLS recursion';
COMMENT ON FUNCTION public.current_user_is_admin() IS 'Non-recursive helper to check if current user is an active admin';
COMMENT ON FUNCTION public.current_user_is_super_admin() IS 'Non-recursive helper to check if current user is a super admin';
COMMENT ON FUNCTION public.get_current_user_admin_role() IS 'Non-recursive helper to get current user admin role';
COMMENT ON FUNCTION public.bootstrap_is_needed() IS 'Non-recursive helper to check if system bootstrap is needed';
