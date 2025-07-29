-- Temporarily disable the audit function by creating a no-op version
CREATE OR REPLACE FUNCTION public.audit_admin_user_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Temporarily disabled during bootstrap reset
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Now safely clear the data
DELETE FROM public.admin_audit_logs;
DELETE FROM public.admin_users;
DELETE FROM public.admin_registrations WHERE status = 'pending' AND registration_type = 'bootstrap';

-- Reset bootstrap status
UPDATE public.system_config 
SET config_value = 'false', updated_at = NOW()
WHERE config_key = 'bootstrap_completed';

-- Fix the RLS policies
DROP POLICY IF EXISTS "Allow INSERT for bootstrap and admin invites" ON public.admin_registrations;
DROP POLICY IF EXISTS "Allow bootstrap and admin registration" ON public.admin_registrations;

CREATE POLICY "Allow bootstrap and admin registration" ON public.admin_registrations
FOR INSERT 
WITH CHECK (
  -- Allow during bootstrap phase (no super admin exists yet)
  (NOT EXISTS (SELECT 1 FROM public.admin_users WHERE role = 'super_admin' AND is_active = true))
  OR 
  -- Allow if current user is an authenticated admin
  (auth.uid() IS NOT NULL AND is_authenticated_admin())
);

-- Fix read policies
DROP POLICY IF EXISTS "Authenticated users can read registrations" ON public.admin_registrations;
DROP POLICY IF EXISTS "Public can read registrations by token" ON public.admin_registrations;

CREATE POLICY "Allow reading registrations" ON public.admin_registrations
FOR SELECT
USING (true);

-- Restore the original audit function
CREATE OR REPLACE FUNCTION public.audit_admin_user_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_admin_action(
      'admin_user_created',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name,
        'role', NEW.role,
        'is_active', NEW.is_active
      )
    );
    
    -- Send notification to all super admins
    INSERT INTO public.admin_notifications (recipient_id, title, message, type, priority)
    SELECT 
      id,
      'New Admin User Created',
      'A new admin user "' || NEW.full_name || '" (' || NEW.email || ') has been created with role: ' || NEW.role,
      'info',
      'normal'
    FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true AND id != auth.uid();
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_admin_action(
      'admin_user_updated',
      NEW.id,
      jsonb_build_object(
        'old_values', jsonb_build_object(
          'email', OLD.email,
          'full_name', OLD.full_name,
          'role', OLD.role,
          'is_active', OLD.is_active
        ),
        'new_values', jsonb_build_object(
          'email', NEW.email,
          'full_name', NEW.full_name,
          'role', NEW.role,
          'is_active', NEW.is_active
        )
      )
    );
    
    -- Send notification for status changes
    IF OLD.is_active != NEW.is_active THEN
      INSERT INTO public.admin_notifications (recipient_id, title, message, type, priority)
      SELECT 
        id,
        'Admin User Status Changed',
        'Admin user "' || NEW.full_name || '" has been ' || CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END,
        CASE WHEN NEW.is_active THEN 'success' ELSE 'warning' END,
        'high'
      FROM public.admin_users 
      WHERE role IN ('super_admin', 'platform_admin') AND is_active = true AND id != auth.uid();
    END IF;
    
    -- Send notification for role changes
    IF OLD.role != NEW.role THEN
      INSERT INTO public.admin_notifications (recipient_id, title, message, type, priority)
      SELECT 
        id,
        'Admin Role Changed',
        'Admin user "' || NEW.full_name || '" role changed from ' || OLD.role || ' to ' || NEW.role,
        'info',
        'high'
      FROM public.admin_users 
      WHERE role = 'super_admin' AND is_active = true AND id != auth.uid();
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only log deletion, don't try to send notifications to deleted user
    PERFORM public.log_admin_action(
      'admin_user_deleted',
      OLD.id,
      jsonb_build_object(
        'email', OLD.email,
        'full_name', OLD.full_name,
        'role', OLD.role
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Verify the reset
SELECT 
  'System reset successfully for bootstrap' as message,
  (SELECT config_value FROM public.system_config WHERE config_key = 'bootstrap_completed') as bootstrap_status,
  (SELECT count(*) FROM public.admin_users) as admin_users_count;