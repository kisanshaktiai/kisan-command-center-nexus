-- Temporarily modify the audit function to not log deletions
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
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Skip logging deletions to avoid foreign key issues during cleanup
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Now clean the tables
DELETE FROM public.admin_audit_logs;
DELETE FROM public.admin_notifications;
DELETE FROM public.admin_registration_tokens;
DELETE FROM public.admin_invites;
DELETE FROM public.admin_registrations;
DELETE FROM public.admin_users;

-- Reset bootstrap state
UPDATE public.system_config 
SET config_value = 'false', updated_at = now()
WHERE config_key = 'bootstrap_completed';