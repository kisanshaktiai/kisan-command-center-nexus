
-- Create billing plans table
CREATE TABLE public.billing_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  plan_type text NOT NULL CHECK (plan_type IN ('starter', 'growth', 'enterprise', 'custom')),
  base_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'quarterly', 'annually')),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create tenant subscriptions table
CREATE TABLE public.tenant_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  billing_plan_id uuid NOT NULL REFERENCES public.billing_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'suspended')),
  current_period_start timestamp with time zone NOT NULL DEFAULT now(),
  current_period_end timestamp with time zone NOT NULL,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method text,
  transaction_id text,
  gateway_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id),
  invoice_number text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date date NOT NULL,
  paid_date date,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create usage records table
CREATE TABLE public.usage_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.tenant_subscriptions(id),
  metric_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'count',
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user profiles table for admin management
CREATE TABLE public.user_profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user tenants table for role management
CREATE TABLE public.user_tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Create platform alerts table
CREATE TABLE public.platform_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_name text NOT NULL,
  description text,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create system metrics table
CREATE TABLE public.system_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  unit text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Super admin policies (accessible by super admins only)
CREATE POLICY "Super admins can access all billing plans" ON public.billing_plans FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Super admins can access all subscriptions" ON public.tenant_subscriptions FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Super admins can access all payments" ON public.payments FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Super admins can access all invoices" ON public.invoices FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Super admins can access all usage records" ON public.usage_records FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Super admins can access all user profiles" ON public.user_profiles FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Super admins can access all user tenants" ON public.user_tenants FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Super admins can access all platform alerts" ON public.platform_alerts FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Super admins can access all system metrics" ON public.system_metrics FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

-- Add updated_at triggers
CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tenants_updated_at
  BEFORE UPDATE ON public.user_tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_alerts_updated_at
  BEFORE UPDATE ON public.platform_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample billing plans
INSERT INTO public.billing_plans (name, description, plan_type, base_price, currency, billing_interval, features, usage_limits) VALUES
('Starter', 'Perfect for small farms getting started', 'starter', 29.99, 'USD', 'monthly', '["Basic AI recommendations", "Weather alerts", "Up to 5 land plots"]', '{"land_plots": 5, "api_calls": 1000}'),
('Growth', 'Ideal for growing agricultural businesses', 'growth', 79.99, 'USD', 'monthly', '["Advanced AI insights", "Market price alerts", "Up to 25 land plots", "Analytics dashboard"]', '{"land_plots": 25, "api_calls": 5000}'),
('Enterprise', 'Comprehensive solution for large operations', 'enterprise', 199.99, 'USD', 'monthly', '["Premium AI models", "Custom integrations", "Unlimited land plots", "Priority support"]', '{"land_plots": -1, "api_calls": 50000}');
