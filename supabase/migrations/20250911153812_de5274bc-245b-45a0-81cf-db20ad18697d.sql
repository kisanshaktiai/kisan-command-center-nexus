-- First, drop the insecure policies that allow public access
DROP POLICY IF EXISTS "System can manage email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Super admins can manage all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Super admins can view all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Tenant members can view their email logs" ON public.email_logs;

-- Drop duplicate/redundant authenticated policies
DROP POLICY IF EXISTS "System can update email logs" ON public.email_logs;
DROP POLICY IF EXISTS "System email logs insert" ON public.email_logs;
DROP POLICY IF EXISTS "System email logs update" ON public.email_logs;
DROP POLICY IF EXISTS "Secure super admin email logs access" ON public.email_logs;
DROP POLICY IF EXISTS "Secure platform admin email logs read" ON public.email_logs;
DROP POLICY IF EXISTS "Secure tenant admin email logs read" ON public.email_logs;

-- Create secure policies for authenticated users only

-- 1. Super admins can manage all email logs
CREATE POLICY "Super admins can manage all email logs" 
ON public.email_logs 
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

-- 2. Platform admins can view all email logs
CREATE POLICY "Platform admins can view email logs" 
ON public.email_logs 
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

-- 3. Tenant admins can view their tenant's email logs
CREATE POLICY "Tenant admins can view their email logs" 
ON public.email_logs 
FOR SELECT 
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('tenant_admin', 'tenant_owner')
  )
);

-- 4. Service role can insert and update email logs (for backend operations)
CREATE POLICY "Service role can insert email logs" 
ON public.email_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update email logs" 
ON public.email_logs 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Authenticated users can insert logs when sending emails (for edge functions)
CREATE POLICY "Authenticated users can insert email logs" 
ON public.email_logs 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Only allow if the user has access to the tenant
  tenant_id IS NULL OR tenant_id IN (
    SELECT tenant_id 
    FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- 6. Authenticated users can update their own email logs (for status updates)
CREATE POLICY "Authenticated users can update email logs" 
ON public.email_logs 
FOR UPDATE 
TO authenticated
USING (
  -- Only allow if the user has access to the tenant
  tenant_id IS NULL OR tenant_id IN (
    SELECT tenant_id 
    FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  tenant_id IS NULL OR tenant_id IN (
    SELECT tenant_id 
    FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Ensure RLS is enabled on the table
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;