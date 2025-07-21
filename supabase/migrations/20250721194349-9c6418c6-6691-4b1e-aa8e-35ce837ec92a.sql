
-- Create OTP table for proper 2FA handling
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login', -- login, reset_password, etc
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON public.otp_verifications(email, purpose, expires_at) WHERE NOT is_used;

-- Create tenant performance metrics table
CREATE TABLE IF NOT EXISTS public.tenant_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- users_active, api_calls, storage_used, revenue, etc
  metric_value NUMERIC NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant onboarding steps table
CREATE TABLE IF NOT EXISTS public.tenant_onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  completed_by UUID NULL,
  step_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system metrics table for platform monitoring
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT, -- percent, bytes, ms, count, etc
  component_name TEXT, -- database, api, storage, etc
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  severity_level TEXT DEFAULT 'info' -- info, warning, error, critical
);

-- Create platform alerts table
CREATE TABLE IF NOT EXISTS public.platform_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_name TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL, -- low, medium, high, critical
  status TEXT DEFAULT 'active', -- active, resolved, acknowledged
  component TEXT, -- system component affected
  tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE NULL,
  metadata JSONB DEFAULT '{}'
);

-- Create usage analytics table
CREATE TABLE IF NOT EXISTS public.usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  storage_used_gb NUMERIC DEFAULT 0,
  features_used JSONB DEFAULT '[]',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_type TEXT DEFAULT 'hourly' -- hourly, daily, weekly
);

-- Enable RLS on new tables
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for OTP verifications (super admin access only)
CREATE POLICY "Super admins can access OTP verifications" ON public.otp_verifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'platform_admin') 
      AND is_active = true
    )
  );

-- RLS policies for tenant performance metrics
CREATE POLICY "Super admins can access all tenant metrics" ON public.tenant_performance_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'platform_admin') 
      AND is_active = true
    )
  );

-- RLS policies for tenant onboarding steps
CREATE POLICY "Super admins can manage onboarding steps" ON public.tenant_onboarding_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'platform_admin') 
      AND is_active = true
    )
  );

-- RLS policies for system metrics
CREATE POLICY "Super admins can access system metrics" ON public.system_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'platform_admin') 
      AND is_active = true
    )
  );

-- RLS policies for platform alerts
CREATE POLICY "Super admins can manage platform alerts" ON public.platform_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'platform_admin') 
      AND is_active = true
    )
  );

-- RLS policies for usage analytics
CREATE POLICY "Super admins can access usage analytics" ON public.usage_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'platform_admin') 
      AND is_active = true
    )
  );

-- Function to generate OTP
CREATE OR REPLACE FUNCTION generate_otp(p_email TEXT, p_purpose TEXT DEFAULT 'login')
RETURNS TEXT AS $$
DECLARE
  v_otp TEXT;
BEGIN
  -- Generate 6-digit OTP
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Clean up expired OTPs for this email and purpose
  DELETE FROM public.otp_verifications 
  WHERE email = p_email 
    AND purpose = p_purpose 
    AND (expires_at < NOW() OR is_used = true);
  
  -- Insert new OTP
  INSERT INTO public.otp_verifications (email, otp_code, purpose, expires_at)
  VALUES (p_email, v_otp, p_purpose, NOW() + INTERVAL '10 minutes');
  
  RETURN v_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_otp(p_email TEXT, p_otp_code TEXT, p_purpose TEXT DEFAULT 'login')
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if OTP exists and is valid
  SELECT COUNT(*) INTO v_count
  FROM public.otp_verifications
  WHERE email = p_email
    AND otp_code = p_otp_code
    AND purpose = p_purpose
    AND expires_at > NOW()
    AND is_used = false;
  
  IF v_count > 0 THEN
    -- Mark OTP as used
    UPDATE public.otp_verifications
    SET is_used = true, used_at = NOW()
    WHERE email = p_email
      AND otp_code = p_otp_code
      AND purpose = p_purpose
      AND expires_at > NOW()
      AND is_used = false;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data for tenant performance metrics
INSERT INTO public.tenant_performance_metrics (tenant_id, metric_type, metric_value, metric_date, period_type)
SELECT 
  t.id as tenant_id,
  'users_active' as metric_type,
  FLOOR(RANDOM() * 100 + 10) as metric_value,
  CURRENT_DATE - (generate_series(0, 30) || ' days')::INTERVAL as metric_date,
  'daily' as period_type
FROM public.tenants t
WHERE t.deleted_at IS NULL
LIMIT 2;

-- Insert sample onboarding steps for tenants
INSERT INTO public.tenant_onboarding_steps (tenant_id, step_name, step_order, is_completed, completed_at)
SELECT 
  t.id,
  step.name,
  step.order_num,
  CASE WHEN step.order_num <= 3 THEN true ELSE false END,
  CASE WHEN step.order_num <= 3 THEN NOW() - (RANDOM() * 7 || ' days')::INTERVAL ELSE NULL END
FROM public.tenants t,
(VALUES 
  ('Account Setup', 1),
  ('Profile Configuration', 2),
  ('Payment Setup', 3),
  ('Feature Configuration', 4),
  ('Integration Setup', 5),
  ('Launch Preparation', 6)
) AS step(name, order_num)
WHERE t.deleted_at IS NULL
LIMIT 12;

-- Insert sample system metrics
INSERT INTO public.system_metrics (metric_name, metric_value, metric_unit, component_name, timestamp, severity_level)
VALUES 
  ('CPU Usage', 45.2, 'percent', 'api_server', NOW() - INTERVAL '5 minutes', 'info'),
  ('Memory Usage', 67.8, 'percent', 'database', NOW() - INTERVAL '3 minutes', 'info'),
  ('Disk Usage', 78.5, 'percent', 'storage', NOW() - INTERVAL '2 minutes', 'warning'),
  ('API Response Time', 125.3, 'ms', 'api_gateway', NOW() - INTERVAL '1 minute', 'info'),
  ('Database Connections', 45, 'count', 'database', NOW(), 'info');

-- Enable real-time for tables
ALTER TABLE public.tenant_performance_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.system_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.platform_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.usage_analytics REPLICA IDENTITY FULL;
ALTER TABLE public.tenant_onboarding_steps REPLICA IDENTITY FULL;

-- Add tables to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_performance_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.usage_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_onboarding_steps;
