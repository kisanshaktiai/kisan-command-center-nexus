-- ============================================
-- Phase 2: Unified Billing Schema Migration (Fixed)
-- KisanShakti AI - Multi-tenant SaaS Platform
-- ============================================

-- 1. EXTEND TENANTS TABLE FOR PAYOUT MANAGEMENT
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
ADD COLUMN IF NOT EXISTS payout_method VARCHAR(50) DEFAULT 'bank_transfer',
ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.tenants.commission_rate IS 'Percentage of transaction amount paid to tenant (0-100)';
COMMENT ON COLUMN public.tenants.payout_method IS 'Method for tenant payouts: bank_transfer, upi, wallet';
COMMENT ON COLUMN public.tenants.bank_details IS 'Encrypted bank account details for payouts';
COMMENT ON COLUMN public.tenants.kyc_status IS 'KYC verification status for payout eligibility';

-- 2. CREATE UNIFIED PLANS TABLE
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  plan_type VARCHAR(50) DEFAULT 'standard' CHECK (plan_type IN ('starter', 'growth', 'enterprise', 'custom', 'standard')),
  duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(3) DEFAULT 'INR',
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON public.plans(is_active) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_plans_tenant_id ON public.plans(tenant_id) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_plans_global ON public.plans(is_global) WHERE is_active = true AND archived = false;

COMMENT ON TABLE public.plans IS 'Unified subscription plans for farmers (tenant-specific or global)';
COMMENT ON COLUMN public.plans.is_global IS 'true = available to all tenants, false = tenant-specific';
COMMENT ON COLUMN public.plans.duration_days IS 'Subscription validity period in days';

-- 3. CREATE SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  payment_gateway VARCHAR(50) DEFAULT 'virtual' CHECK (payment_gateway IN ('virtual', 'razorpay', 'stripe', 'manual')),
  payment_id VARCHAR(255),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'suspended')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,
  activation_code_id UUID REFERENCES public.activation_codes(id),
  metadata JSONB DEFAULT '{}',
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_farmer_id ON public.subscriptions(farmer_id) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date) WHERE status = 'active';

COMMENT ON TABLE public.subscriptions IS 'Farmer subscription records linking to plans and payments';
COMMENT ON COLUMN public.subscriptions.payment_gateway IS 'Gateway used: virtual (test), razorpay, stripe, manual (offline)';

-- 4. CREATE TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL,
  gateway VARCHAR(50) NOT NULL CHECK (gateway IN ('virtual', 'razorpay', 'stripe')),
  gateway_txn_id VARCHAR(255),
  payment_intent_id VARCHAR(255),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_mode VARCHAR(50) DEFAULT 'online' CHECK (payment_mode IN ('online', 'offline', 'wallet')),
  payment_method VARCHAR(50),
  virtual_mode BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded')),
  gateway_response JSONB DEFAULT '{}',
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount NUMERIC(10,2),
  metadata JSONB DEFAULT '{}',
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_subscription_id ON public.transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer_id ON public.transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway ON public.transactions(gateway);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway_txn_id ON public.transactions(gateway_txn_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

COMMENT ON TABLE public.transactions IS 'Unified payment transaction log supporting multiple gateways';
COMMENT ON COLUMN public.transactions.virtual_mode IS 'true = test/dummy payment, false = real gateway payment';
COMMENT ON COLUMN public.transactions.gateway_txn_id IS 'External transaction ID from payment gateway';

-- 5. CREATE PAYOUTS TABLE
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  commission_rate NUMERIC(5,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payout_method VARCHAR(50),
  transfer_ref VARCHAR(255),
  gateway_response JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_tenant_id ON public.payouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payouts_transaction_id ON public.payouts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON public.payouts(created_at DESC);

COMMENT ON TABLE public.payouts IS 'Tenant commission/settlement records';
COMMENT ON COLUMN public.payouts.transfer_ref IS 'Reference ID from payout gateway (RazorpayX, Stripe Connect)';

-- 6. ENHANCE ACTIVATION_CODES TABLE
ALTER TABLE public.activation_codes
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS redeemed_by UUID REFERENCES public.farmers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.activation_codes(code) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_activation_codes_plan_id ON public.activation_codes(plan_id);
CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON public.activation_codes(status);

-- 7. ENHANCE FARMERS TABLE
ALTER TABLE public.farmers
ADD COLUMN IF NOT EXISTS current_subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_farmers_subscription_id ON public.farmers(current_subscription_id);
CREATE INDEX IF NOT EXISTS idx_farmers_subscription_status ON public.farmers(subscription_status);

-- 8. CREATE TRIGGER FUNCTIONS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all new tables
DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payouts_updated_at ON public.payouts;
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Plans (simplified - checking admin_users table)
CREATE POLICY "Global plans are viewable by everyone"
  ON public.plans FOR SELECT
  USING (is_global = true AND is_active = true AND archived = false);

CREATE POLICY "Tenant users can view their tenant plans"
  ON public.plans FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage all plans"
  ON public.plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    )
  );

-- RLS Policies for Subscriptions
CREATE POLICY "Farmers can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (farmer_id IN (
    SELECT id FROM public.farmers WHERE user_profile_id = auth.uid()
  ));

CREATE POLICY "Tenant users can view their tenant subscriptions"
  ON public.subscriptions FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    )
  );

-- RLS Policies for Transactions
CREATE POLICY "Farmers can view their own transactions"
  ON public.transactions FOR SELECT
  USING (farmer_id IN (
    SELECT id FROM public.farmers WHERE user_profile_id = auth.uid()
  ));

CREATE POLICY "Tenant users can view their tenant transactions"
  ON public.transactions FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage all transactions"
  ON public.transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    )
  );

-- RLS Policies for Payouts
CREATE POLICY "Tenant users can view their tenant payouts"
  ON public.payouts FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage all payouts"
  ON public.payouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    )
  );

-- 10. CREATE VIEWS FOR CONVENIENCE
CREATE OR REPLACE VIEW public.active_subscriptions AS
SELECT 
  s.*,
  f.farmer_name,
  f.mobile_number,
  t.name as tenant_name,
  p.title as plan_title,
  p.duration_days
FROM public.subscriptions s
JOIN public.farmers f ON s.farmer_id = f.id
JOIN public.tenants t ON s.tenant_id = t.id
JOIN public.plans p ON s.plan_id = p.id
WHERE s.status = 'active' 
  AND s.archived = false
  AND (s.end_date IS NULL OR s.end_date > NOW());

CREATE OR REPLACE VIEW public.pending_payouts AS
SELECT 
  p.*,
  t.name as tenant_name,
  t.commission_rate as current_commission_rate,
  t.bank_details,
  tr.amount as transaction_amount,
  tr.gateway
FROM public.payouts p
JOIN public.tenants t ON p.tenant_id = t.id
LEFT JOIN public.transactions tr ON p.transaction_id = tr.id
WHERE p.status = 'pending' 
  AND p.archived = false;

-- 11. INSERT DEFAULT GLOBAL PLANS
INSERT INTO public.plans (title, description, plan_type, duration_days, price, currency, is_global, features, limits)
VALUES 
  ('Basic Monthly', 'Access to basic features for 30 days', 'starter', 30, 299.00, 'INR', true, 
   '{"ai_queries": true, "weather_updates": true, "market_prices": true}'::jsonb,
   '{"max_queries_per_day": 10, "storage_mb": 100}'::jsonb),
  ('Pro Monthly', 'Professional features with extended limits', 'growth', 30, 599.00, 'INR', true,
   '{"ai_queries": true, "weather_updates": true, "market_prices": true, "expert_consultation": true}'::jsonb,
   '{"max_queries_per_day": 50, "storage_mb": 500}'::jsonb),
  ('Enterprise Annual', 'Full access with priority support for 365 days', 'enterprise', 365, 4999.00, 'INR', true,
   '{"ai_queries": true, "weather_updates": true, "market_prices": true, "expert_consultation": true, "priority_support": true}'::jsonb,
   '{"max_queries_per_day": -1, "storage_mb": 5000}'::jsonb)
ON CONFLICT DO NOTHING;

COMMENT ON VIEW public.active_subscriptions IS 'Active farmer subscriptions with related details';
COMMENT ON VIEW public.pending_payouts IS 'Pending tenant payouts with transaction context';