
-- Fix search path vulnerabilities in database functions
-- This addresses the critical security issue where functions could be vulnerable to schema poisoning

-- Update functions to use secure search path
CREATE OR REPLACE FUNCTION public.cleanup_old_dashboard_updates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.dashboard_updates WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants 
    WHERE user_id = auth.uid() 
    AND tenant_id = tenant_uuid 
    AND is_active = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_invite_valid(invite_token text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.invites
    WHERE token = invite_token
    AND expires_at > now()
    AND used_at IS NULL
  );
$function$;

CREATE OR REPLACE FUNCTION public.mark_invite_used(invite_token text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.invites
  SET used_at = now()
  WHERE token = invite_token
  AND expires_at > now()
  AND used_at IS NULL
  RETURNING true;
$function$;

CREATE OR REPLACE FUNCTION public.get_location_context(lat double precision, lng double precision)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  context JSONB := '{}';
BEGIN
  -- Validate input parameters
  IF lat IS NULL OR lng IS NULL THEN
    RAISE EXCEPTION 'Latitude and longitude cannot be null';
  END IF;
  
  IF lat < -90 OR lat > 90 THEN
    RAISE EXCEPTION 'Invalid latitude value: %', lat;
  END IF;
  
  IF lng < -180 OR lng > 180 THEN
    RAISE EXCEPTION 'Invalid longitude value: %', lng;
  END IF;
  
  context := jsonb_build_object(
    'coordinates', jsonb_build_object('lat', lat, 'lng', lng),
    'accuracy', 'estimated',
    'source', 'coordinates'
  );
  
  RETURN context;
END;
$function$;

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

-- Add account lockout table for enhanced authentication security
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add password history table
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add security events table for enhanced monitoring
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new security tables
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for account lockouts (admin access only)
CREATE POLICY "Super admins can view account lockouts" ON public.account_lockouts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  )
);

-- RLS policies for password history (users can only see their own)
CREATE POLICY "Users can view their password history" ON public.password_history
FOR SELECT USING (user_id = auth.uid());

-- RLS policies for security events (admin access for all, users for their own)
CREATE POLICY "Super admins can view all security events" ON public.security_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin') 
    AND is_active = true
  )
);

CREATE POLICY "Users can view their security events" ON public.security_events
FOR SELECT USING (user_id = auth.uid());

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL,
  p_event_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_risk_level TEXT DEFAULT 'low'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_id UUID;
BEGIN
  -- Validate inputs
  IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
    RAISE EXCEPTION 'Event type cannot be null or empty';
  END IF;
  
  IF p_risk_level NOT IN ('low', 'medium', 'high', 'critical') THEN
    p_risk_level := 'low';
  END IF;
  
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_details,
    ip_address,
    user_agent,
    risk_level
  ) VALUES (
    p_user_id,
    p_event_type,
    COALESCE(p_event_details, '{}'),
    p_ip_address,
    p_user_agent,
    p_risk_level
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;

-- Function to check and manage account lockouts
CREATE OR REPLACE FUNCTION public.check_account_lockout(
  p_email TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS JSONB
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

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(
  p_email TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS JSONB
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
  INSERT INTO public.account_lockouts (email, failed_attempts, ip_address)
  VALUES (p_email, 1, p_ip_address)
  ON CONFLICT (email) DO UPDATE SET
    failed_attempts = account_lockouts.failed_attempts + 1,
    last_attempt_at = now(),
    updated_at = now(),
    ip_address = COALESCE(p_ip_address, account_lockouts.ip_address)
  RETURNING * INTO lockout_record;
  
  new_attempts := lockout_record.failed_attempts;
  
  -- Check if we should lock the account
  IF new_attempts >= max_attempts THEN
    should_lock := true;
    UPDATE public.account_lockouts
    SET locked_until = now() + lockout_duration
    WHERE id = lockout_record.id;
  END IF;
  
  -- Log security event
  PERFORM public.log_security_event(
    NULL,
    'failed_login_attempt',
    jsonb_build_object(
      'email', p_email,
      'attempt_count', new_attempts,
      'account_locked', should_lock
    ),
    p_ip_address,
    NULL,
    CASE WHEN should_lock THEN 'high' ELSE 'medium' END
  );
  
  RETURN jsonb_build_object(
    'is_locked', should_lock,
    'attempts_remaining', GREATEST(0, max_attempts - new_attempts),
    'locked_until', CASE WHEN should_lock THEN now() + lockout_duration ELSE NULL END
  );
END;
$function$;
