-- Fix the registration token generation issue by using base64 instead of base64url
-- and create the missing system_config record

-- Create system_config entry for bootstrap tracking
INSERT INTO public.system_config (config_key, config_value, description) 
VALUES ('bootstrap_completed', 'false', 'Indicates if system bootstrap has been completed')
ON CONFLICT (config_key) DO NOTHING;

-- Fix admin_registrations table to use base64 encoding instead of base64url
ALTER TABLE public.admin_registrations 
ALTER COLUMN registration_token SET DEFAULT encode(gen_random_bytes(32), 'base64');