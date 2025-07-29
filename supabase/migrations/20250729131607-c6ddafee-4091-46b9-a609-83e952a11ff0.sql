-- Clean up incomplete bootstrap state and ensure proper system configuration

-- First, let's check if there's a confirmed user in auth.users that should be a super admin
-- We'll create a function to handle this cleanup

CREATE OR REPLACE FUNCTION public.cleanup_bootstrap_state()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  confirmed_user_id UUID;
  confirmed_user_email TEXT;
  confirmed_user_name TEXT;
BEGIN
  -- Find confirmed users from auth.users who might be bootstrap users
  SELECT id, email, raw_user_meta_data->>'full_name'
  INTO confirmed_user_id, confirmed_user_email, confirmed_user_name
  FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL 
  AND raw_user_meta_data->>'registration_token' IS NOT NULL
  LIMIT 1;
  
  -- If we found a confirmed user who should be an admin
  IF confirmed_user_id IS NOT NULL THEN
    -- Check if admin_users record exists
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = confirmed_user_id) THEN
      -- Create the admin user record
      INSERT INTO public.admin_users (
        id, 
        email, 
        full_name, 
        role, 
        is_active,
        created_at,
        updated_at
      ) VALUES (
        confirmed_user_id,
        confirmed_user_email,
        COALESCE(confirmed_user_name, 'Super Admin'),
        'super_admin',
        true,
        now(),
        now()
      );
      
      -- Mark any pending registrations as completed
      UPDATE public.admin_registrations 
      SET 
        status = 'completed',
        completed_at = now(),
        updated_at = now()
      WHERE email = confirmed_user_email 
      AND status = 'pending';
      
      -- Mark bootstrap as completed
      INSERT INTO public.system_config (config_key, config_value, created_at, updated_at)
      VALUES ('bootstrap_completed', 'true', now(), now())
      ON CONFLICT (config_key) 
      DO UPDATE SET 
        config_value = 'true',
        updated_at = now();
        
      RAISE NOTICE 'Bootstrap cleanup completed for user: %', confirmed_user_email;
    END IF;
  END IF;
END;
$$;

-- Run the cleanup function
SELECT public.cleanup_bootstrap_state();

-- Create a better bootstrap completion helper function
CREATE OR REPLACE FUNCTION public.complete_bootstrap_for_user(user_id UUID, user_email TEXT, user_name TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success BOOLEAN := false;
BEGIN
  -- Create admin user if doesn't exist
  INSERT INTO public.admin_users (
    id, 
    email, 
    full_name, 
    role, 
    is_active,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    user_name,
    'super_admin',
    true,
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Mark any pending registrations as completed
  UPDATE public.admin_registrations 
  SET 
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE email = user_email 
  AND status = 'pending';
  
  -- Mark bootstrap as completed
  INSERT INTO public.system_config (config_key, config_value, created_at, updated_at)
  VALUES ('bootstrap_completed', 'true', now(), now())
  ON CONFLICT (config_key) 
  DO UPDATE SET 
    config_value = 'true',
    updated_at = now();
    
  success := true;
  RETURN success;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error completing bootstrap: %', SQLERRM;
    RETURN false;
END;
$$;