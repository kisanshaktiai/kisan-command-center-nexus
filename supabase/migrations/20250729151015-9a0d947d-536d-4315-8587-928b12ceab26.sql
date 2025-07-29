-- Temporarily disable audit trigger to avoid foreign key issues
DROP TRIGGER IF EXISTS admin_user_audit_trigger ON public.admin_users;

-- Clean database tables for fresh start
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

-- If system_config doesn't exist, create it
INSERT INTO public.system_config (config_key, config_value, created_at, updated_at)
VALUES ('bootstrap_completed', 'false', now(), now())
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = 'false',
  updated_at = now();

-- Recreate the audit trigger
CREATE TRIGGER admin_user_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_user_changes();