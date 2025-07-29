-- Fix missing bootstrap completion flag
INSERT INTO public.system_config (config_key, config_value, created_at, updated_at)
VALUES ('bootstrap_completed', 'true', now(), now())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = 'true',
  updated_at = now();