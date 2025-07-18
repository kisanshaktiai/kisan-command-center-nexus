
-- First, let's check if the tenants table exists and what RLS policies are currently applied
-- If no policies exist for INSERT operations on tenants table, we need to create them

-- Allow super admins to manage tenants (including creation)
CREATE POLICY IF NOT EXISTS "Super admins can manage all tenants" 
ON public.tenants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin') 
    AND is_active = true
  )
);

-- Alternative policy if the above doesn't work - allow authenticated users with admin email patterns
CREATE POLICY IF NOT EXISTS "Authenticated admins can create tenants" 
ON public.tenants 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  (auth.jwt() ->> 'email') LIKE '%admin%'
);

-- Ensure RLS is enabled on tenants table
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
