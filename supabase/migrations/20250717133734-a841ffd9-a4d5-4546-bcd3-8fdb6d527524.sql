
-- Create enum types for onboarding
CREATE TYPE onboarding_step_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped', 'failed');
CREATE TYPE subscription_plan_type AS ENUM ('basic', 'premium', 'enterprise', 'custom');
CREATE TYPE billing_interval AS ENUM ('monthly', 'quarterly', 'annually');

-- Onboarding workflows table
CREATE TABLE public.onboarding_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 6,
  status TEXT DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding steps table
CREATE TABLE public.onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.onboarding_workflows(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_status onboarding_step_status DEFAULT 'pending',
  step_data JSONB DEFAULT '{}',
  validation_errors JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workflow_id, step_number)
);

-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  plan_type subscription_plan_type NOT NULL,
  price_monthly DECIMAL(10,2),
  price_quarterly DECIMAL(10,2),
  price_annually DECIMAL(10,2),
  features JSONB DEFAULT '[]',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id), -- null for global plans
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tenant subscriptions table
CREATE TABLE public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  billing_interval billing_interval NOT NULL,
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  payment_method JSONB DEFAULT '{}',
  billing_address JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- White-label configurations table
CREATE TABLE public.white_label_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  brand_identity JSONB DEFAULT '{}', -- logo, colors, fonts
  domain_config JSONB DEFAULT '{}', -- custom domain settings
  email_templates JSONB DEFAULT '{}', -- customized email templates
  app_store_config JSONB DEFAULT '{}', -- app store listing details
  pwa_config JSONB DEFAULT '{}', -- PWA configuration
  splash_screens JSONB DEFAULT '{}', -- custom splash screens
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feature configurations table
CREATE TABLE public.feature_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  config_data JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, feature_name)
);

-- Data migration jobs table
CREATE TABLE public.data_migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  migration_type TEXT NOT NULL, -- 'farmers', 'products', 'historical', etc.
  status TEXT DEFAULT 'pending',
  source_config JSONB DEFAULT '{}',
  mapping_config JSONB DEFAULT '{}',
  progress_data JSONB DEFAULT '{}',
  error_log JSONB DEFAULT '[]',
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  invitation_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.onboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding workflows
CREATE POLICY "Users can manage their tenant onboarding workflows" ON public.onboarding_workflows
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

-- RLS Policies for onboarding steps
CREATE POLICY "Users can manage their tenant onboarding steps" ON public.onboarding_steps
FOR ALL USING (workflow_id IN (
  SELECT id FROM onboarding_workflows WHERE tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
  )
));

-- RLS Policies for subscription plans
CREATE POLICY "Anyone can view active global plans" ON public.subscription_plans
FOR SELECT USING (is_active = true AND tenant_id IS NULL);

CREATE POLICY "Users can manage their custom plans" ON public.subscription_plans
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

-- RLS Policies for tenant subscriptions
CREATE POLICY "Users can manage their tenant subscriptions" ON public.tenant_subscriptions
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

-- RLS Policies for white-label configs
CREATE POLICY "Users can manage their tenant white-label configs" ON public.white_label_configs
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

-- RLS Policies for feature configs
CREATE POLICY "Users can manage their tenant feature configs" ON public.feature_configs
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

-- RLS Policies for data migration jobs
CREATE POLICY "Users can manage their tenant migration jobs" ON public.data_migration_jobs
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

-- RLS Policies for team invitations
CREATE POLICY "Users can manage their tenant team invitations" ON public.team_invitations
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, plan_type, price_monthly, price_quarterly, price_annually, features, limits) VALUES
('Basic', 'Perfect for small farms and individual farmers', 'basic', 29.99, 79.99, 299.99, 
 '["farmer_management", "basic_analytics", "weather_data", "market_prices"]',
 '{"max_farmers": 100, "max_lands": 50, "storage_gb": 5, "api_calls_per_month": 10000}'),
('Premium', 'Ideal for medium-sized agri businesses', 'premium', 99.99, 269.99, 999.99,
 '["farmer_management", "advanced_analytics", "weather_data", "market_prices", "satellite_data", "prescription_maps", "marketplace"]',
 '{"max_farmers": 1000, "max_lands": 500, "storage_gb": 50, "api_calls_per_month": 100000}'),
('Enterprise', 'Complete solution for large agricultural organizations', 'enterprise', 299.99, 809.99, 2999.99,
 '["farmer_management", "advanced_analytics", "weather_data", "market_prices", "satellite_data", "prescription_maps", "marketplace", "white_labeling", "api_access", "custom_integrations"]',
 '{"max_farmers": -1, "max_lands": -1, "storage_gb": 500, "api_calls_per_month": 1000000}');

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_onboarding_workflows_updated_at BEFORE UPDATE ON public.onboarding_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_steps_updated_at BEFORE UPDATE ON public.onboarding_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_subscriptions_updated_at BEFORE UPDATE ON public.tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_white_label_configs_updated_at BEFORE UPDATE ON public.white_label_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_configs_updated_at BEFORE UPDATE ON public.feature_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_migration_jobs_updated_at BEFORE UPDATE ON public.data_migration_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON public.team_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
