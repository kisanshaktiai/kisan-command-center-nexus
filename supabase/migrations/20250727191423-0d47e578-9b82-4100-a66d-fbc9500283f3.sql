
-- Phase 1: Critical Security Fixes

-- 1. Create security definer functions to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.admin_users 
  WHERE id = auth.uid() 
  AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin', 'admin')
  );
$$;

-- 2. Fix admin_users RLS policies to prevent infinite recursion
DROP POLICY IF EXISTS "Admins can view their own record" ON public.admin_users;
DROP POLICY IF EXISTS "Platform admins can manage regular admins" ON public.admin_users;
DROP POLICY IF EXISTS "Self-registration for super admin email" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON public.admin_users;

-- Create new, non-recursive policies using security definer functions
CREATE POLICY "Admins can view their own record"
ON public.admin_users
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Super admins can manage all admin users"
ON public.admin_users
FOR ALL
USING (public.is_current_user_super_admin())
WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Platform admins can manage regular admins"
ON public.admin_users
FOR ALL
USING (
  public.get_current_admin_role() = 'platform_admin' 
  AND role NOT IN ('super_admin', 'platform_admin')
)
WITH CHECK (
  public.get_current_admin_role() = 'platform_admin' 
  AND role NOT IN ('super_admin', 'platform_admin')
);

-- Special policy for super admin self-registration (one-time setup)
CREATE POLICY "Super admin self-registration"
ON public.admin_users
FOR INSERT
WITH CHECK (
  id = auth.uid() 
  AND email = 'kisanshaktiai@gmail.com' 
  AND role = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  )
);

-- 3. Create audit trail for admin actions
CREATE OR REPLACE FUNCTION public.audit_admin_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Log admin user changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_logs (
      admin_id, action, target_admin_id, details
    ) VALUES (
      auth.uid(), 'admin_created', NEW.id,
      jsonb_build_object('email', NEW.email, 'role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_audit_logs (
      admin_id, action, target_admin_id, details
    ) VALUES (
      auth.uid(), 'admin_updated', NEW.id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_logs (
      admin_id, action, target_admin_id, details
    ) VALUES (
      auth.uid(), 'admin_deleted', OLD.id,
      jsonb_build_object('email', OLD.email, 'role', OLD.role)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Apply audit trigger to admin_users table
DROP TRIGGER IF EXISTS audit_admin_user_changes ON public.admin_users;
CREATE TRIGGER audit_admin_user_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_changes();

-- 4. Fix security events logging
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  user_id uuid DEFAULT NULL,
  tenant_id uuid DEFAULT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text DEFAULT NULL,
  user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type,
    user_id,
    tenant_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    event_type,
    COALESCE(user_id, auth.uid()),
    tenant_id,
    COALESCE(metadata, '{}'),
    ip_address,
    user_agent
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to log security event: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- 5. Create function to safely check admin permissions
CREATE OR REPLACE FUNCTION public.check_admin_permission(
  required_role text DEFAULT 'admin'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role text;
  role_hierarchy text[] := ARRAY['super_admin', 'platform_admin', 'admin'];
  user_level int;
  required_level int;
BEGIN
  -- Get current user's role
  SELECT role INTO user_role 
  FROM public.admin_users 
  WHERE id = auth.uid() AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check role hierarchy
  SELECT array_position(role_hierarchy, user_role) INTO user_level;
  SELECT array_position(role_hierarchy, required_role) INTO required_level;
  
  -- Return true if user has sufficient privileges
  RETURN user_level <= required_level;
END;
$$;

-- 6. Update session tracking for admin users
CREATE OR REPLACE FUNCTION public.track_admin_session(
  session_data jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only track if user is an admin
  IF NOT public.is_current_user_admin() THEN
    RETURN;
  END IF;
  
  -- Update or insert session tracking
  INSERT INTO public.active_sessions (
    user_id, 
    session_started_at, 
    last_active_at,
    client_info
  ) VALUES (
    auth.uid(),
    now(),
    now(),
    session_data
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    last_active_at = now(),
    client_info = EXCLUDED.client_info;
END;
$$;

-- 7. Grant necessary permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_admin_session(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, uuid, uuid, jsonb, text, text) TO authenticated;
