
-- Create enum types for billing
CREATE TYPE billing_interval AS ENUM ('monthly', 'quarterly', 'annually');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'canceled', 'past_due', 'trialing', 'paused');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'disputed');
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'void', 'uncollectible');
CREATE TYPE payment_method_type AS ENUM ('card', 'bank_transfer', 'upi', 'wallet', 'net_banking');
CREATE TYPE usage_metric_type AS ENUM ('api_calls', 'storage_gb', 'bandwidth_gb', 'users', 'transactions', 'custom');

-- Billing plans table
CREATE TABLE public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL DEFAULT 'standard', -- starter, growth, enterprise, custom
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_interval billing_interval NOT NULL DEFAULT 'monthly',
  trial_days INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}',
  usage_limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage pricing tiers for metered billing
CREATE TABLE public.usage_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.billing_plans(id) ON DELETE CASCADE,
  metric_type usage_metric_type NOT NULL,
  tier_name TEXT NOT NULL,
  from_quantity INTEGER NOT NULL DEFAULT 0,
  to_quantity INTEGER, -- NULL for unlimited
  price_per_unit DECIMAL(10,4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tenant subscriptions
CREATE TABLE public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.billing_plans(id),
  status subscription_status DEFAULT 'active',
  billing_interval billing_interval NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  payment_method_id UUID,
  billing_address JSONB DEFAULT '{}',
  tax_rates JSONB DEFAULT '[]',
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment methods
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  type payment_method_type NOT NULL,
  is_default BOOLEAN DEFAULT false,
  gateway_customer_id TEXT,
  gateway_payment_method_id TEXT,
  last_four TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  card_brand TEXT,
  billing_address JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage records for metered billing
CREATE TABLE public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE,
  metric_type usage_metric_type NOT NULL,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,4),
  total_amount DECIMAL(10,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id),
  invoice_number TEXT UNIQUE NOT NULL,
  status invoice_status DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_due DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  issued_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  billing_address JSONB DEFAULT '{}',
  tax_breakdown JSONB DEFAULT '{}',
  pdf_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice line items
CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,4) NOT NULL DEFAULT 0,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  line_type TEXT DEFAULT 'subscription', -- subscription, usage, one_time, discount
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  subscription_id UUID REFERENCES public.tenant_subscriptions(id),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  gateway_payment_id TEXT,
  gateway_name TEXT NOT NULL, -- razorpay, stripe
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status DEFAULT 'pending',
  payment_intent_id TEXT,
  failure_code TEXT,
  failure_message TEXT,
  paid_at TIMESTAMPTZ,
  refunded_amount DECIMAL(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Credit notes for refunds and adjustments
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  credit_note_number TEXT UNIQUE NOT NULL,
  reason TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT DEFAULT 'issued',
  issued_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ,
  pdf_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Failed payment attempts and dunning
CREATE TABLE public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  payment_method_id UUID REFERENCES public.payment_methods(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status DEFAULT 'pending',
  gateway_response JSONB DEFAULT '{}',
  error_code TEXT,
  error_message TEXT,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  next_retry_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_billing_plans_active ON public.billing_plans(is_active, plan_type);
CREATE INDEX idx_usage_pricing_tiers_plan ON public.usage_pricing_tiers(plan_id, metric_type);
CREATE INDEX idx_tenant_subscriptions_tenant ON public.tenant_subscriptions(tenant_id, status);
CREATE INDEX idx_tenant_subscriptions_period ON public.tenant_subscriptions(current_period_end);
CREATE INDEX idx_payment_methods_tenant ON public.payment_methods(tenant_id, is_active);
CREATE INDEX idx_usage_records_tenant_period ON public.usage_records(tenant_id, billing_period_start, billing_period_end);
CREATE INDEX idx_usage_records_subscription ON public.usage_records(subscription_id, recorded_at DESC);
CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id, status, issued_at DESC);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date) WHERE status IN ('pending', 'overdue');
CREATE INDEX idx_invoice_line_items_invoice ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_payments_tenant ON public.payments(tenant_id, status, created_at DESC);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_credit_notes_tenant ON public.credit_notes(tenant_id, issued_at DESC);
CREATE INDEX idx_payment_attempts_invoice ON public.payment_attempts(invoice_id, attempt_number);

-- Enable RLS on all tables
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active public billing plans" ON public.billing_plans
FOR SELECT USING (is_active = true AND is_public = true);

CREATE POLICY "Anyone can view usage pricing tiers for public plans" ON public.usage_pricing_tiers
FOR SELECT USING (plan_id IN (SELECT id FROM billing_plans WHERE is_active = true AND is_public = true));

CREATE POLICY "Tenants can manage their subscriptions" ON public.tenant_subscriptions
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Tenants can manage their payment methods" ON public.payment_methods
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Tenants can view their usage records" ON public.usage_records
FOR SELECT USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Tenants can manage their invoices" ON public.invoices
FOR ALL USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Users can view invoice line items for their tenant invoices" ON public.invoice_line_items
FOR SELECT USING (invoice_id IN (
  SELECT id FROM invoices WHERE tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
  )
));

CREATE POLICY "Tenants can view their payments" ON public.payments
FOR SELECT USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Tenants can view their credit notes" ON public.credit_notes
FOR SELECT USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Tenants can view their payment attempts" ON public.payment_attempts
FOR SELECT USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND is_active = true
));

-- Super admin policies
CREATE POLICY "Super admins can manage billing plans" ON public.billing_plans
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can manage usage pricing tiers" ON public.usage_pricing_tiers
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can view all billing data" ON public.tenant_subscriptions
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can view all payment methods" ON public.payment_methods
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can manage usage records" ON public.usage_records
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can manage all invoices" ON public.invoices
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can manage invoice line items" ON public.invoice_line_items
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can manage all payments" ON public.payments
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can manage credit notes" ON public.credit_notes
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

CREATE POLICY "Super admins can manage payment attempts" ON public.payment_attempts
FOR ALL USING (auth.jwt() ->> 'email' LIKE '%admin%');

-- Create triggers for updated_at
CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON public.billing_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_subscriptions_updated_at BEFORE UPDATE ON public.tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default billing plans
INSERT INTO public.billing_plans (name, description, plan_type, base_price, billing_interval, trial_days, features, usage_limits) VALUES
('Starter', 'Perfect for small businesses getting started', 'starter', 999.00, 'monthly', 14, 
 '{"farmer_management": true, "basic_analytics": true, "weather_data": true, "mobile_app": true}',
 '{"max_farmers": 50, "max_lands": 25, "api_calls_per_month": 5000, "storage_gb": 1}'),
('Growth', 'Ideal for growing agricultural businesses', 'growth', 2999.00, 'monthly', 14,
 '{"farmer_management": true, "advanced_analytics": true, "weather_data": true, "mobile_app": true, "satellite_data": true, "market_prices": true}',
 '{"max_farmers": 500, "max_lands": 250, "api_calls_per_month": 50000, "storage_gb": 10}'),
('Enterprise', 'Complete solution for large organizations', 'enterprise', 9999.00, 'monthly', 30,
 '{"farmer_management": true, "advanced_analytics": true, "weather_data": true, "mobile_app": true, "satellite_data": true, "market_prices": true, "white_labeling": true, "api_access": true, "priority_support": true}',
 '{"max_farmers": -1, "max_lands": -1, "api_calls_per_month": 1000000, "storage_gb": 100}');

-- Insert usage pricing tiers
INSERT INTO public.usage_pricing_tiers (plan_id, metric_type, tier_name, from_quantity, to_quantity, price_per_unit) 
SELECT p.id, 'api_calls', 'Overage', ul.api_calls_per_month, NULL, 
  CASE 
    WHEN p.plan_type = 'starter' THEN 0.10
    WHEN p.plan_type = 'growth' THEN 0.05
    ELSE 0.02
  END
FROM billing_plans p, 
LATERAL (SELECT (p.usage_limits->>'api_calls_per_month')::integer as api_calls_per_month) ul
WHERE p.usage_limits->>'api_calls_per_month' IS NOT NULL;
