-- Complete the bootstrap process by marking it as completed
INSERT INTO public.system_config (config_key, config_value, updated_at)
VALUES ('bootstrap_completed', 'true', NOW())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = 'true',
  updated_at = NOW();

-- Verify the bootstrap status
SELECT config_key, config_value 
FROM public.system_config 
WHERE config_key = 'bootstrap_completed';