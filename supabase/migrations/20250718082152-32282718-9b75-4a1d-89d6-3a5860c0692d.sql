
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admin users can view admin_users" ON public.admin_users;

-- Create a simpler, non-recursive policy that allows authenticated users to read admin records
-- This allows the auth check to work without infinite recursion
CREATE POLICY "Authenticated users can view admin users" ON public.admin_users
  FOR SELECT 
  USING (auth.role() = 'authenticated');
