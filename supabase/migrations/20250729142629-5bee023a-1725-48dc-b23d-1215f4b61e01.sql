-- Fix the bootstrap state by marking it as completed
UPDATE system_config 
SET config_value = 'true', updated_at = NOW()
WHERE config_key = 'bootstrap_completed';

-- Complete the pending admin registration
UPDATE admin_registrations 
SET status = 'completed', 
    completed_at = NOW(),
    updated_at = NOW()
WHERE email = 'amarsinhp@gmail.com' 
  AND registration_type = 'bootstrap' 
  AND status = 'pending';