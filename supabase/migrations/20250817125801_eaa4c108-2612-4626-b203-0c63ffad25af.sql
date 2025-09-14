
-- Create enum for supported payment gateways
CREATE TYPE payment_gateway_type AS ENUM ('stripe', 'paypal', 'razorpay', 'cash_mode');

-- Create enum for payment transaction statuses
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');

-- Create payment_gateways table for available gateway configurations
CREATE TABLE public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_type payment_gateway_type NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  configuration JSONB NOT NULL DEFAULT '{}',
  supported_currencies TEXT[] NOT NULL DEFAULT ARRAY['USD', 'INR', 'EUR'],
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenant_payment_configs table for tenant-specific gateway settings
CREATE TABLE public.tenant_payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  gateway_type payment_gateway_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  api_keys JSONB NOT NULL DEFAULT '{}', -- Encrypted gateway keys
  webhook_secret TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  last_validated_at TIMESTAMPTZ,
  validation_status TEXT DEFAULT 'pending',
  validation_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, gateway_type)
);

-- Create payment_transactions table for unified transaction tracking
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  gateway_type payment_gateway_type NOT NULL,
  external_transaction_id TEXT,
  payment_intent_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  customer_id TEXT,
  subscription_id TEXT,
  invoice_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  gateway_response JSONB DEFAULT '{}',
  webhook_data JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add default payment gateway preference to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS default_payment_gateway payment_gateway_type DEFAULT 'cash_mode',
ADD COLUMN IF NOT EXISTS payment_gateway_enabled BOOLEAN DEFAULT false;

-- Insert default payment gateways
INSERT INTO public.payment_gateways (gateway_type, name, display_name, description, configuration, supported_currencies) VALUES
('stripe', 'stripe', 'Stripe', 'Global payment processing platform', '{"test_mode": true, "webhook_endpoints": []}', ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR']),
('paypal', 'paypal', 'PayPal', 'Digital payments platform', '{"sandbox_mode": true}', ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD']),
('razorpay', 'razorpay', 'Razorpay', 'Indian payment gateway', '{"test_mode": true}', ARRAY['INR']),
('cash_mode', 'cash_mode', 'Cash Mode (Testing)', 'Testing mode for development and demos', '{"always_succeed": true}', ARRAY['USD', 'INR', 'EUR']);

-- Enable RLS on new tables
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_gateways
CREATE POLICY "Anyone can view active payment gateways" ON public.payment_gateways
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage payment gateways" ON public.payment_gateways
  FOR ALL USING (is_authenticated_admin());

-- RLS Policies for tenant_payment_configs
CREATE POLICY "Tenant users can manage their payment configs" ON public.tenant_payment_configs
  FOR ALL USING (
    tenant_id IN (
      SELECT user_tenants.tenant_id
      FROM user_tenants
      WHERE user_tenants.user_id = auth.uid()
      AND user_tenants.is_active = true
      AND user_tenants.role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Super admins can view all payment configs" ON public.tenant_payment_configs
  FOR SELECT USING (is_authenticated_admin());

-- RLS Policies for payment_transactions
CREATE POLICY "Tenant users can view their payment transactions" ON public.payment_transactions
  FOR SELECT USING (
    tenant_id IN (
      SELECT user_tenants.tenant_id
      FROM user_tenants
      WHERE user_tenants.user_id = auth.uid()
      AND user_tenants.is_active = true
    )
  );

CREATE POLICY "Super admins can view all payment transactions" ON public.payment_transactions
  FOR SELECT USING (is_authenticated_admin());

CREATE POLICY "System can manage payment transactions" ON public.payment_transactions
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_tenant_payment_configs_tenant_id ON public.tenant_payment_configs(tenant_id);
CREATE INDEX idx_tenant_payment_configs_gateway_type ON public.tenant_payment_configs(gateway_type);
CREATE INDEX idx_payment_transactions_tenant_id ON public.payment_transactions(tenant_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_gateway_type ON public.payment_transactions(gateway_type);
CREATE INDEX idx_payment_transactions_external_id ON public.payment_transactions(external_transaction_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE ON public.payment_gateways FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_payment_configs_updated_at BEFORE UPDATE ON public.tenant_payment_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
