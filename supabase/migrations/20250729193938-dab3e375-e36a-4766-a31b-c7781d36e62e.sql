-- Fix RLS policies to allow bootstrap checking without authentication

-- Allow public read access to system_config for bootstrap_completed flag only
CREATE POLICY "Public can check bootstrap status" 
ON public.system_config 
FOR SELECT 
USING (config_key = 'bootstrap_completed');

-- Allow public read access to admin_users to check if super admins exist (bootstrap check)
CREATE POLICY "Public can check super admin existence for bootstrap" 
ON public.admin_users 
FOR SELECT 
USING (role = 'super_admin' AND is_active = true);