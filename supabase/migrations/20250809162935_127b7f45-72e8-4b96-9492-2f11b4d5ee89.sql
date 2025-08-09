
-- Fix search path vulnerabilities in critical database functions
-- This prevents potential SQL injection and ensures functions use the correct schema

-- Fix bootstrap completion function
CREATE OR REPLACE FUNCTION public.complete_bootstrap()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.system_config 
  SET config_value = 'true', updated_at = now()
  WHERE config_key = 'bootstrap_completed';
$function$;

-- Fix bootstrap check function
CREATE OR REPLACE FUNCTION public.is_bootstrap_completed()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((config_value::text)::boolean, false)
  FROM public.system_config 
  WHERE config_key = 'bootstrap_completed';
$function$;

-- Fix admin authentication function
CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true
    LIMIT 1;
    
    RETURN user_role IN ('super_admin', 'platform_admin', 'admin');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$function$;

-- Fix super admin check function
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  );
$function$;

-- Add security functions for role checking
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
 RETURNS TEXT
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.admin_users 
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role = 'super_admin'
  );
$function$;

-- Fix account lockout check with proper types
CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email text, p_ip_address inet DEFAULT NULL::inet)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lockout_record RECORD;
  max_attempts INTEGER := 5;
  lockout_duration INTERVAL := '15 minutes';
  result JSONB;
BEGIN
  -- Validate email
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;
  
  -- Get current lockout status
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = p_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no lockout record exists, account is not locked
  IF lockout_record IS NULL THEN
    RETURN jsonb_build_object(
      'is_locked', false,
      'attempts_remaining', max_attempts,
      'locked_until', null
    );
  END IF;
  
  -- Check if lockout has expired
  IF lockout_record.locked_until IS NOT NULL AND lockout_record.locked_until <= now() THEN
    -- Reset lockout
    UPDATE public.account_lockouts
    SET failed_attempts = 0, locked_until = NULL, updated_at = now()
    WHERE id = lockout_record.id;
    
    RETURN jsonb_build_object(
      'is_locked', false,
      'attempts_remaining', max_attempts,
      'locked_until', null
    );
  END IF;
  
  -- Check if account is currently locked
  IF lockout_record.locked_until IS NOT NULL AND lockout_record.locked_until > now() THEN
    RETURN jsonb_build_object(
      'is_locked', true,
      'attempts_remaining', 0,
      'locked_until', lockout_record.locked_until
    );
  END IF;
  
  -- Return current status
  RETURN jsonb_build_object(
    'is_locked', false,
    'attempts_remaining', GREATEST(0, max_attempts - lockout_record.failed_attempts),
    'locked_until', null
  );
END;
$function$;

-- Fix failed login recording function
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email text, p_ip_address inet DEFAULT NULL::inet)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lockout_record RECORD;
  max_attempts INTEGER := 5;
  lockout_duration INTERVAL := '15 minutes';
  new_attempts INTEGER;
  should_lock BOOLEAN := false;
BEGIN
  -- Validate email
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;
  
  -- Get or create lockout record
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = p_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF lockout_record IS NULL THEN
    -- Create new lockout record
    INSERT INTO public.account_lockouts (
      email, user_id, failed_attempts, ip_address, last_attempt_at
    ) VALUES (
      p_email, auth.uid(), 1, p_ip_address, now()
    );
    new_attempts := 1;
  ELSE
    -- Increment attempts
    new_attempts := lockout_record.failed_attempts + 1;
    should_lock := new_attempts >= max_attempts;
    
    UPDATE public.account_lockouts
    SET 
      failed_attempts = new_attempts,
      locked_until = CASE WHEN should_lock THEN now() + lockout_duration ELSE NULL END,
      last_attempt_at = now(),
      updated_at = now()
    WHERE id = lockout_record.id;
  END IF;
  
  RETURN jsonb_build_object(
    'is_locked', should_lock,
    'attempts_remaining', GREATEST(0, max_attempts - new_attempts),
    'locked_until', CASE WHEN should_lock THEN now() + lockout_duration ELSE NULL END
  );
END;
$function$;

-- Restrict overly permissive RLS policies for leads table
DROP POLICY IF EXISTS "qual:true" ON public.leads;

-- Create proper tenant-based access for leads
CREATE POLICY "Tenant admins can manage leads in their tenant" 
ON public.leads FOR ALL
USING (
  tenant_id IN (
    SELECT ut.tenant_id 
    FROM user_tenants ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.role IN ('tenant_owner', 'tenant_admin')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT ut.tenant_id 
    FROM user_tenants ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Super admins can access all leads
CREATE POLICY "Super admins can manage all leads"
ON public.leads FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  )
);

-- Assigned admins can view and update their leads
CREATE POLICY "Assigned admins can manage their leads"
ON public.leads FOR ALL
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- Add bootstrap security table for one-time tokens
CREATE TABLE IF NOT EXISTS public.bootstrap_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '1 hour'),
  used_at timestamp with time zone,
  created_by text,
  metadata jsonb DEFAULT '{}',
  is_active boolean DEFAULT true
);

-- Enable RLS on bootstrap tokens
ALTER TABLE public.bootstrap_tokens ENABLE ROW LEVEL SECURITY;

-- Only system can manage bootstrap tokens
CREATE POLICY "System manages bootstrap tokens"
ON public.bootstrap_tokens FOR ALL
USING (false)
WITH CHECK (false);

-- Add security headers table for CSP and other security headers
CREATE TABLE IF NOT EXISTS public.security_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  header_name text NOT NULL,
  header_value text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security headers
ALTER TABLE public.security_headers ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage security headers
CREATE POLICY "Super admins can manage security headers"
ON public.security_headers FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Insert default security headers
INSERT INTO public.security_headers (header_name, header_value) VALUES
('Content-Security-Policy', 'default-src ''self''; script-src ''self'' ''unsafe-inline'' ''unsafe-eval'' https://cdnjs.cloudflare.com; style-src ''self'' ''unsafe-inline''; img-src ''self'' data: https:; font-src ''self'' https://fonts.gstatic.com; connect-src ''self'' https://*.supabase.co wss://*.supabase.co'),
('X-Frame-Options', 'DENY'),
('X-Content-Type-Options', 'nosniff'),
('Referrer-Policy', 'strict-origin-when-cross-origin'),
('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
ON CONFLICT DO NOTHING;
