-- Restore the full audit function with proper deletion logging
CREATE OR REPLACE FUNCTION public.audit_admin_user_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;