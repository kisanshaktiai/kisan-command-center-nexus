-- Drop the foreign key constraint temporarily
ALTER TABLE public.admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_target_admin_id_fkey;

-- Drop triggers that might cause issues
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

-- Recreate the foreign key constraint
ALTER TABLE public.admin_audit_logs 
ADD CONSTRAINT admin_audit_logs_target_admin_id_fkey 
FOREIGN KEY (target_admin_id) REFERENCES public.admin_users(id);

-- Recreate the audit trigger
CREATE TRIGGER admin_user_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_user_changes();