-- Create INSERT policy for admin_registrations to allow bootstrap process
-- This policy allows INSERT during bootstrap (when no user is authenticated)
-- or when an authenticated admin is creating invites

CREATE POLICY "Allow INSERT for bootstrap and admin invites" 
ON public.admin_registrations 
FOR INSERT 
WITH CHECK (
  -- Allow during bootstrap when no user is authenticated and bootstrap is not completed
  (auth.uid() IS NULL AND NOT is_bootstrap_completed()) 
  OR 
  -- Allow authenticated admins to create invites
  (auth.uid() IS NOT NULL AND is_authenticated_admin())
);