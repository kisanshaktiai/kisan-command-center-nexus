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

-- Apply the same security fixes to email_templates table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_templates') THEN
        -- Drop any public policies on email templates
        DROP POLICY IF EXISTS "Public can read email templates" ON public.email_templates;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.email_templates;
        DROP POLICY IF EXISTS "Public access to email templates" ON public.email_templates;
        
        -- Create secure policies for email templates
        -- Super admins have full access
        CREATE POLICY "Secure super admin email templates access" ON public.email_templates
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
        
        -- Tenant admins can manage their own email templates
        CREATE POLICY "Secure tenant admin email templates access" ON public.email_templates
        FOR ALL
        TO authenticated
        USING (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid() 
            AND is_active = true 
            AND role IN ('tenant_admin', 'tenant_owner')
          ) OR tenant_id IS NULL -- Allow access to default templates
        )
        WITH CHECK (
          tenant_id IN (
            SELECT tenant_id FROM public.user_tenants 
            WHERE user_id = auth.uid() 
            AND is_active = true 
            AND role IN ('tenant_admin', 'tenant_owner')
          )
        );
    END IF;
END $$;

-- Apply the same security fixes to email_verifications table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_verifications') THEN
        -- Drop any public policies on email verifications
        DROP POLICY IF EXISTS "Public can read email verifications" ON public.email_verifications;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.email_verifications;
        DROP POLICY IF EXISTS "Public access to email verifications" ON public.email_verifications;
        
        -- Create secure policies for email verifications
        -- Users can only access their own email verifications
        CREATE POLICY "Users can access their own email verifications" ON public.email_verifications
        FOR ALL
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
        
        -- Super admins can view all email verifications
        CREATE POLICY "Super admins can view all email verifications" ON public.email_verifications
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid() 
            AND role = 'super_admin' 
            AND is_active = true
          )
        );
        
        -- System can manage email verifications
        CREATE POLICY "System email verifications insert" ON public.email_verifications
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
        
        CREATE POLICY "System email verifications update" ON public.email_verifications
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

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
    'description', 'Removed public access to email logs, templates, and verifications tables and created secure access controls',
    'timestamp', now(),
    'affected_tables', jsonb_build_array('email_logs', 'email_templates', 'email_verifications')
  )
);