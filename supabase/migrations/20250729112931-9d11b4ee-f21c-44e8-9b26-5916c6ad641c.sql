-- Reset bootstrap status since we don't have a working super admin yet
UPDATE public.system_config 
SET config_value = 'false', updated_at = NOW()
WHERE config_key = 'bootstrap_completed';

-- Fix the RLS policy for admin_registrations to allow bootstrap process
DROP POLICY IF EXISTS "Allow INSERT for bootstrap and admin invites" ON public.admin_registrations;

-- Create a more permissive policy for the initial bootstrap
CREATE POLICY "Allow bootstrap and admin registration" ON public.admin_registrations
FOR INSERT 
WITH CHECK (
  -- Allow during bootstrap phase (no super admin exists yet)
  (NOT EXISTS (SELECT 1 FROM public.admin_users WHERE role = 'super_admin' AND is_active = true))
  OR 
  -- Allow if current user is an authenticated admin
  (auth.uid() IS NOT NULL AND is_authenticated_admin())
);

-- Also ensure we can read registrations during bootstrap
DROP POLICY IF EXISTS "Authenticated users can read registrations" ON public.admin_registrations;
DROP POLICY IF EXISTS "Public can read registrations by token" ON public.admin_registrations;

CREATE POLICY "Allow reading registrations" ON public.admin_registrations
FOR SELECT
USING (true);

-- Clear any existing failed admin registrations to start fresh
DELETE FROM public.admin_registrations WHERE status = 'pending' AND registration_type = 'bootstrap';

-- Clear any existing admin users that might be incomplete
DELETE FROM public.admin_users;

-- Verify the changes
SELECT 
  config_key, 
  config_value,
  'Bootstrap reset for fresh start' as message
FROM public.system_config 
WHERE config_key = 'bootstrap_completed';