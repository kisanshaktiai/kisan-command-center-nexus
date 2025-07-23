
-- Enable full replica identity for realtime tracking on key tables
ALTER TABLE public.tenants REPLICA IDENTITY FULL;
ALTER TABLE public.api_logs REPLICA IDENTITY FULL;
ALTER TABLE public.tenant_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.usage_analytics REPLICA IDENTITY FULL;
ALTER TABLE public.system_metrics REPLICA IDENTITY FULL;

-- Add these tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_metrics;

-- Create a table for active user sessions tracking
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  session_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  client_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a table for real-time notifications
CREATE TABLE IF NOT EXISTS public.platform_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on these tables
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for active_sessions
CREATE POLICY "Super admins can view all sessions" ON public.active_sessions
FOR SELECT USING (public.is_authenticated_admin());

CREATE POLICY "Tenant admins can view their tenant sessions" ON public.active_sessions
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() 
    AND role IN ('tenant_admin', 'tenant_owner')
    AND is_active = true
  )
);

-- Create RLS policies for platform_notifications
CREATE POLICY "Super admins can manage all notifications" ON public.platform_notifications
FOR ALL USING (public.is_authenticated_admin());

CREATE POLICY "Users can view notifications for their tenant" ON public.platform_notifications
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) OR tenant_id IS NULL
);

-- Add the new tables to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_notifications;

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_active_sessions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_active_sessions_timestamp
BEFORE UPDATE ON public.active_sessions
FOR EACH ROW
EXECUTE FUNCTION update_active_sessions_timestamp();
