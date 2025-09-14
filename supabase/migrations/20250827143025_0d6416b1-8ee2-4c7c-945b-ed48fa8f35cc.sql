-- Enable RLS on email_logs table if not already enabled
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Public can read email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Anyone can read email logs" ON public.email_logs;

-- Create policy for tenant members to view their own tenant's email logs
CREATE POLICY "Tenant members can view their email logs"
ON public.email_logs
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Create policy for system to insert email logs
CREATE POLICY "System can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Create policy for system to update email logs (for status updates)
CREATE POLICY "System can update email logs"
ON public.email_logs
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create policy for super admins to manage all email logs
CREATE POLICY "Super admins can manage all email logs"
ON public.email_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- Add index for performance on tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_id ON public.email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);