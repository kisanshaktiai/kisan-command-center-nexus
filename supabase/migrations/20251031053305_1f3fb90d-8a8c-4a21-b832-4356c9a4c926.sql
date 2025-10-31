-- Advanced Billing System Enhancement for 2030-Ready SaaS

-- 1. Tenant Wallet/Credits System
CREATE TABLE IF NOT EXISTS public.tenant_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  auto_topup_enabled BOOLEAN DEFAULT false,
  auto_topup_threshold DECIMAL(12, 2),
  auto_topup_amount DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, currency)
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.tenant_wallets(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2),
  balance_after DECIMAL(12, 2),
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Multi-Currency Support
CREATE TABLE IF NOT EXISTS public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  target_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(12, 6) NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  source VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(base_currency, target_currency, valid_from)
);

-- 3. Advanced Pricing Models
CREATE TABLE IF NOT EXISTS public.pricing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_name VARCHAR(100) NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  base_price DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  billing_interval VARCHAR(20),
  usage_metrics JSONB DEFAULT '{}',
  tier_config JSONB DEFAULT '[]',
  volume_discounts JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tax Configuration per Region
CREATE TABLE IF NOT EXISTS public.tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL,
  region VARCHAR(100),
  tax_type VARCHAR(50) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL,
  tax_id_required BOOLEAN DEFAULT false,
  reverse_charge_applicable BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. E-Invoice Configuration
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) DEFAULT 'standard',
  locale VARCHAR(10) DEFAULT 'en_US',
  currency VARCHAR(3) DEFAULT 'USD',
  company_details JSONB NOT NULL,
  tax_details JSONB DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  qr_code_enabled BOOLEAN DEFAULT true,
  digital_signature_enabled BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Payment Retry Configuration
CREATE TABLE IF NOT EXISTS public.payment_retry_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payment_records(id) ON DELETE CASCADE,
  retry_attempt INTEGER NOT NULL,
  retry_status VARCHAR(50),
  failure_reason TEXT,
  next_retry_at TIMESTAMPTZ,
  gateway_response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Billing Analytics & Metrics
CREATE TABLE IF NOT EXISTS public.billing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  arr DECIMAL(12, 2),
  mrr DECIMAL(12, 2),
  ltv DECIMAL(12, 2),
  churn_rate DECIMAL(5, 2),
  expansion_revenue DECIMAL(12, 2),
  contraction_revenue DECIMAL(12, 2),
  active_subscriptions INTEGER,
  new_subscriptions INTEGER,
  cancelled_subscriptions INTEGER,
  payment_success_rate DECIMAL(5, 2),
  average_revenue_per_user DECIMAL(12, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, metric_date)
);

-- 8. Automation Rules
CREATE TABLE IF NOT EXISTS public.billing_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  trigger_condition JSONB NOT NULL,
  action_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Notification Logs
CREATE TABLE IF NOT EXISTS public.billing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Subscription Changes History
CREATE TABLE IF NOT EXISTS public.subscription_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL,
  old_plan_id UUID,
  new_plan_id UUID,
  old_price DECIMAL(12, 2),
  new_price DECIMAL(12, 2),
  proration_amount DECIMAL(12, 2),
  effective_date TIMESTAMPTZ NOT NULL,
  initiated_by UUID,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.tenant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_retry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_change_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Super Admins (using email pattern matching used elsewhere in the system)
CREATE POLICY "Admins can manage wallets" ON public.tenant_wallets FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can view wallet transactions" ON public.wallet_transactions FOR SELECT USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can manage currency rates" ON public.currency_rates FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can manage pricing models" ON public.pricing_models FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can manage tax configs" ON public.tax_configurations FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can manage invoice templates" ON public.invoice_templates FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can view payment retry logs" ON public.payment_retry_logs FOR SELECT USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can view billing analytics" ON public.billing_analytics FOR SELECT USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can manage automation rules" ON public.billing_automation_rules FOR ALL USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can view notifications" ON public.billing_notifications FOR SELECT USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

CREATE POLICY "Admins can view subscription history" ON public.subscription_change_history FOR SELECT USING (
  auth.jwt() ->> 'email' LIKE '%admin%'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_wallets_tenant ON public.tenant_wallets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_currency_rates_valid ON public.currency_rates(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_pricing_models_tenant ON public.pricing_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_analytics_tenant_date ON public.billing_analytics(tenant_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_tenant ON public.billing_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON public.subscription_change_history(subscription_id);

-- Seed initial data
INSERT INTO public.currency_rates (base_currency, target_currency, rate, source) VALUES
  ('USD', 'INR', 83.12, 'manual'),
  ('USD', 'EUR', 0.92, 'manual'),
  ('USD', 'GBP', 0.79, 'manual'),
  ('USD', 'JPY', 149.50, 'manual'),
  ('USD', 'AUD', 1.52, 'manual')
ON CONFLICT DO NOTHING;

INSERT INTO public.tax_configurations (country_code, region, tax_type, tax_rate, is_active) VALUES
  ('IN', 'ALL', 'GST', 18.00, true),
  ('US', 'CA', 'sales_tax', 7.25, true),
  ('GB', 'ALL', 'VAT', 20.00, true),
  ('DE', 'ALL', 'VAT', 19.00, true),
  ('FR', 'ALL', 'VAT', 20.00, true),
  ('AU', 'ALL', 'GST', 10.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.billing_automation_rules (rule_name, rule_type, trigger_condition, action_config, is_active) VALUES
  ('Payment Reminder - 7 days before', 'payment_reminder', 
   '{"days_before_due": 7}'::jsonb, 
   '{"email": true, "sms": false, "whatsapp": false}'::jsonb, true),
  ('Payment Reminder - 1 day before', 'payment_reminder', 
   '{"days_before_due": 1}'::jsonb, 
   '{"email": true, "sms": true, "whatsapp": true}'::jsonb, true),
  ('Failed Payment Retry - 1st attempt', 'failed_payment_retry', 
   '{"hours_after_failure": 24}'::jsonb, 
   '{"retry_payment": true, "email": true}'::jsonb, true),
  ('Subscription Expiry Warning', 'subscription_expiry', 
   '{"days_before_expiry": 3}'::jsonb, 
   '{"email": true, "whatsapp": true}'::jsonb, true)
ON CONFLICT DO NOTHING;