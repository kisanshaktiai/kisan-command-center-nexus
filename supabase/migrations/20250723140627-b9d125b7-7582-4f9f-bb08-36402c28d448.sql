
-- Create security_events table for audit logging
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security_events table
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security_events
CREATE POLICY "Super admins can manage all security events"
ON public.security_events
FOR ALL
TO authenticated
USING (public.is_authenticated_admin())
WITH CHECK (public.is_authenticated_admin());

-- Create policy for users to insert their own security events
CREATE POLICY "Users can insert their own security events"
ON public.security_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  user_id UUID DEFAULT NULL,
  tenant_id UUID DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type,
    user_id,
    tenant_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    event_type,
    COALESCE(user_id, auth.uid()),
    tenant_id,
    COALESCE(metadata, '{}'),
    ip_address,
    user_agent
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON public.security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
