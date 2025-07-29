-- Clean database tables for fresh start
DELETE FROM public.admin_users;
DELETE FROM public.admin_invites;
DELETE FROM public.admin_registration_tokens;
DELETE FROM public.admin_registrations;
DELETE FROM public.admin_notifications;
DELETE FROM public.admin_audit_logs;

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