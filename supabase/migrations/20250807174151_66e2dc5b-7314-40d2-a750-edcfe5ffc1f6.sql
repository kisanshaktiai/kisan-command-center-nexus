
-- Create table for idempotency tracking to prevent duplicate tenant creation
CREATE TABLE public.tenant_creation_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  admin_id uuid REFERENCES auth.users(id),
  tenant_id uuid,
  status text NOT NULL DEFAULT 'processing',
  request_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  error_details jsonb DEFAULT '{}'
);

-- Create index for fast lookups
CREATE INDEX idx_tenant_creation_requests_key ON public.tenant_creation_requests(idempotency_key);
CREATE INDEX idx_tenant_creation_requests_admin ON public.tenant_creation_requests(admin_id);

-- Create table for rate limiting tracking
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL, -- admin_id or ip_address
  identifier_type text NOT NULL, -- 'admin' or 'ip'
  endpoint text NOT NULL DEFAULT 'create-tenant-with-admin',
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  last_request timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for rate limiting
CREATE UNIQUE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier, identifier_type, endpoint);
CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

-- Enhance admin_audit_logs table with additional security fields
ALTER TABLE public.admin_audit_logs 
ADD COLUMN IF NOT EXISTS request_id text,
ADD COLUMN IF NOT EXISTS correlation_id text,
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS request_payload jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS response_data jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS duration_ms integer,
ADD COLUMN IF NOT EXISTS security_context jsonb DEFAULT '{}';

-- Enhance email_logs table for better tracking
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS delivery_attempts integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_attempt_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS provider_response jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS correlation_id text,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';

-- Add RLS policies for new tables
ALTER TABLE public.tenant_creation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_creation_requests
CREATE POLICY "Admins can manage their creation requests" 
  ON public.tenant_creation_requests 
  FOR ALL 
  USING (admin_id = auth.uid());

CREATE POLICY "Super admins can view all creation requests" 
  ON public.tenant_creation_requests 
  FOR SELECT 
  USING (is_super_admin());

-- RLS policies for rate_limits
CREATE POLICY "System can manage rate limits" 
  ON public.rate_limits 
  FOR ALL 
  USING (true);

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to clean up old idempotency records
CREATE OR REPLACE FUNCTION public.cleanup_old_idempotency_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.tenant_creation_requests 
  WHERE created_at < now() - interval '24 hours'
  AND status IN ('completed', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function for enhanced audit logging
CREATE OR REPLACE FUNCTION public.log_enhanced_admin_action(
  p_action character varying,
  p_target_admin_id uuid DEFAULT NULL::uuid,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address inet DEFAULT NULL::inet,
  p_user_agent text DEFAULT NULL::text,
  p_request_id text DEFAULT NULL::text,
  p_correlation_id text DEFAULT NULL::text,
  p_session_id text DEFAULT NULL::text,
  p_request_payload jsonb DEFAULT '{}'::jsonb,
  p_response_data jsonb DEFAULT '{}'::jsonb,
  p_duration_ms integer DEFAULT NULL::integer,
  p_security_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.admin_audit_logs (
    admin_id,
    target_admin_id,
    action,
    details,
    ip_address,
    user_agent,
    request_id,
    correlation_id,
    session_id,
    request_payload,
    response_data,
    duration_ms,
    security_context
  ) VALUES (
    auth.uid(),
    p_target_admin_id,
    p_action,
    p_details,
    p_ip_address,
    p_user_agent,
    p_request_id,
    p_correlation_id,
    p_session_id,
    p_request_payload,
    p_response_data,
    p_duration_ms,
    p_security_context
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;
