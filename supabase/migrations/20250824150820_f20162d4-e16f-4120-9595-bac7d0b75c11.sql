
-- First, let's check and potentially fix any problematic functions that might be referencing non-existent columns
-- Drop any problematic triggers on auth.users that might be causing the issue
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create a safe function to handle user updates without referencing is_active
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update last_sign_in if it's actually a sign-in event
  -- Don't try to access non-existent columns
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove any problematic RLS policies that might reference non-existent columns
-- Let's create a safe function to check admin status
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a function to safely check if bootstrap is needed without causing auth errors
CREATE OR REPLACE FUNCTION public.get_bootstrap_status()
RETURNS JSONB AS $$
DECLARE
  has_super_admin BOOLEAN := FALSE;
  bootstrap_completed BOOLEAN := FALSE;
BEGIN
  -- Safely check for super admin existence
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  ) INTO has_super_admin;
  
  -- Check system config for bootstrap completion
  SELECT COALESCE((config_value::text)::boolean, false)
  FROM public.system_config 
  WHERE config_key = 'bootstrap_completed'
  INTO bootstrap_completed;
  
  RETURN jsonb_build_object(
    'completed', COALESCE(bootstrap_completed, false) OR has_super_admin
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the system_config table exists for bootstrap tracking
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policy for system_config
CREATE POLICY "Super admins can manage system config" ON public.system_config
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Allow public read access to bootstrap status
CREATE POLICY "Public can read bootstrap status" ON public.system_config
FOR SELECT USING (config_key = 'bootstrap_completed');
