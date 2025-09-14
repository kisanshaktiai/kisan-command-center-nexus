
-- Add missing columns to security_events table
ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

-- Rename metadata to event_details for consistency
ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS event_details jsonb DEFAULT '{}';

-- Update existing records to have event_details from metadata
UPDATE public.security_events 
SET event_details = COALESCE(metadata, '{}')
WHERE event_details IS NULL OR event_details = '{}';

-- Create security_alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message text NOT NULL,
  event_details jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES auth.users(id),
  tenant_id uuid,
  user_id uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS on security_alerts
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security_alerts
CREATE POLICY "Super admins can manage all security alerts"
ON public.security_alerts FOR ALL
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

-- Create policy for tenant admins
CREATE POLICY "Tenant admins can view tenant security alerts"
ON public.security_alerts FOR SELECT
USING (
  tenant_id IN (
    SELECT ut.tenant_id 
    FROM user_tenants ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Update the log_security_event function to handle risk_level
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid DEFAULT NULL::uuid,
  p_event_type text DEFAULT NULL::text,
  p_event_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address inet DEFAULT NULL::inet,
  p_user_agent text DEFAULT NULL::text,
  p_risk_level text DEFAULT 'low'::text
)
RETURNS uuid
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
    risk_level,
    metadata,
    tenant_id
  ) VALUES (
    p_user_id,
    p_event_type,
    COALESCE(p_event_details, '{}'),
    p_ip_address,
    p_user_agent,
    p_risk_level,
    COALESCE(p_event_details, '{}'), -- Keep metadata for backward compatibility
    COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::uuid, null)
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;
