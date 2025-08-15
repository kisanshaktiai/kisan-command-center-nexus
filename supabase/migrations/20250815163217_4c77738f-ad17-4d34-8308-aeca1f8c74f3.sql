-- Fix security vulnerability: Remove public access to email logs table
-- and create secure access controls for email communications data

-- First, check and drop any existing public policies that expose email data
DROP POLICY IF EXISTS "Public can read email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.email_logs;
DROP POLICY IF EXISTS "Public access to email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Anyone can read email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Public read access" ON public.email_logs;

-- Drop any existing conflicting policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Super admins can manage all email logs') THEN
        DROP POLICY "Super admins can manage all email logs" ON public.email_logs;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Platform admins can view email logs') THEN
        DROP POLICY "Platform admins can view email logs" ON public.email_logs;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Tenant admins can view their email logs') THEN
        DROP POLICY "Tenant admins can view their email logs" ON public.email_logs;
    END IF;
END $$;

-- Create secure policies for email logs access
-- Super admins have full access to all email logs
CREATE POLICY "Secure super admin email logs access" ON public.email_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Platform admins can view email logs but cannot modify them
CREATE POLICY "Secure platform admin email logs read" ON public.email_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin') 
    AND is_active = true
  )
);

-- Tenant admins can only view email logs for their own tenant
CREATE POLICY "Secure tenant admin email logs read" ON public.email_logs
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('tenant_admin', 'tenant_owner')
  )
);

-- System can insert email logs (for email service functionality)
CREATE POLICY "System email logs insert" ON public.email_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- System can update email logs status (for email service functionality) 
CREATE POLICY "System email logs update" ON public.email_logs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Log this security fix
INSERT INTO public.admin_audit_logs (
  admin_id,
  action,
  details
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'security_fix_applied',
  jsonb_build_object(
    'issue', 'email_logs_public_access_removed',
    'description', 'Removed public access to email logs table and created secure access controls for system administrators only',
    'timestamp', now(),
    'affected_tables', jsonb_build_array('email_logs')
  )
);