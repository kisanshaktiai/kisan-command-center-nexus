
-- Create enum types for monitoring
CREATE TYPE metric_type AS ENUM ('system', 'usage', 'ai_model', 'financial', 'custom');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');

-- System metrics table for real-time and historical data
CREATE TABLE public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_type metric_type NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  labels JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usage analytics table
CREATE TABLE public.usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  session_duration INTERVAL,
  endpoint_path TEXT,
  response_time_ms INTEGER,
  status_code INTEGER,
  user_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI model metrics table
CREATE TABLE public.ai_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_version TEXT,
  tenant_id UUID REFERENCES public.tenants(id),
  query_count INTEGER DEFAULT 0,
  avg_response_time_ms NUMERIC,
  accuracy_score NUMERIC,
  resource_usage JSONB DEFAULT '{}',
  error_rate NUMERIC DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial metrics table
CREATE TABLE public.financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  metric_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  period_start DATE,
  period_end DATE,
  category TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts table
CREATE TABLE public.platform_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_name TEXT NOT NULL,
  description TEXT,
  severity alert_severity NOT NULL,
  status alert_status DEFAULT 'active',
  metric_name TEXT,
  threshold_value NUMERIC,
  current_value NUMERIC,
  tenant_id UUID REFERENCES public.tenants(id),
  triggered_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Dashboard configurations table
CREATE TABLE public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  dashboard_name TEXT NOT NULL,
  layout JSONB NOT NULL,
  widgets JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled reports table
CREATE TABLE public.scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name TEXT NOT NULL,
  description TEXT,
  schedule_cron TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  report_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_system_metrics_timestamp ON public.system_metrics(timestamp DESC);
CREATE INDEX idx_system_metrics_tenant ON public.system_metrics(tenant_id, timestamp DESC);
CREATE INDEX idx_system_metrics_type ON public.system_metrics(metric_type, timestamp DESC);

CREATE INDEX idx_usage_analytics_timestamp ON public.usage_analytics(timestamp DESC);
CREATE INDEX idx_usage_analytics_tenant ON public.usage_analytics(tenant_id, timestamp DESC);
CREATE INDEX idx_usage_analytics_feature ON public.usage_analytics(feature_name, timestamp DESC);

CREATE INDEX idx_ai_model_metrics_timestamp ON public.ai_model_metrics(timestamp DESC);
CREATE INDEX idx_ai_model_metrics_model ON public.ai_model_metrics(model_name, timestamp DESC);

CREATE INDEX idx_financial_metrics_timestamp ON public.financial_metrics(timestamp DESC);
CREATE INDEX idx_financial_metrics_tenant ON public.financial_metrics(tenant_id, timestamp DESC);

CREATE INDEX idx_platform_alerts_status ON public.platform_alerts(status, triggered_at DESC);
CREATE INDEX idx_platform_alerts_severity ON public.platform_alerts(severity, triggered_at DESC);

-- Enable RLS on all tables
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for super admin access
CREATE POLICY "Super admins can access all metrics" ON public.system_metrics
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can access all usage analytics" ON public.usage_analytics
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can access all AI metrics" ON public.ai_model_metrics
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can access all financial metrics" ON public.financial_metrics
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can access all alerts" ON public.platform_alerts
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Users can manage their dashboard configs" ON public.dashboard_configs
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage scheduled reports" ON public.scheduled_reports
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

-- Create triggers for updated_at
CREATE TRIGGER update_platform_alerts_updated_at BEFORE UPDATE ON public.platform_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_configs_updated_at BEFORE UPDATE ON public.dashboard_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON public.scheduled_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
