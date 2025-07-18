-- Create missing tables for schema completeness
-- This migration addresses the TypeScript compilation errors

-- Create billing_plans table (referenced but missing)
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_monthly DECIMAL(10,2),
  price_quarterly DECIMAL(10,2),
  price_annually DECIMAL(10,2),
  billing_interval VARCHAR DEFAULT 'monthly',
  features JSONB DEFAULT '{}'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table (referenced but missing)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subscription_id UUID REFERENCES tenant_subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method JSONB,
  payment_status VARCHAR DEFAULT 'pending',
  payment_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  invoice_number VARCHAR,
  transaction_id VARCHAR,
  gateway_response JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_verifications table (referenced but missing)
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  verification_token VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create password_reset_requests table (referenced but missing)
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  reset_token VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add settings column to tenants table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'settings') THEN
    ALTER TABLE tenants ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add password_changed_at column to user_profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'password_changed_at') THEN
    ALTER TABLE user_profiles ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add email_verified_at column to user_profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email_verified_at') THEN
    ALTER TABLE user_profiles ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add is_account_locked column to user_profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_account_locked') THEN
    ALTER TABLE user_profiles ADD COLUMN is_account_locked BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create database functions for authentication tracking
CREATE OR REPLACE FUNCTION public.track_failed_login(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Insert failed login attempt
  INSERT INTO auth.audit_log_entries (
    instance_id,
    id,
    payload,
    created_at,
    ip_address
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    json_build_object(
      'action', 'failed_login',
      'user_id', p_user_id,
      'timestamp', now(),
      'user_agent', p_user_agent
    ),
    now(),
    p_ip_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.track_user_login(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Insert successful login
  INSERT INTO auth.audit_log_entries (
    instance_id,
    id,
    payload,
    created_at,
    ip_address
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    json_build_object(
      'action', 'user_login',
      'user_id', p_user_id,
      'timestamp', now(),
      'user_agent', p_user_agent
    ),
    now(),
    p_ip_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view billing plans" ON public.billing_plans
  FOR SELECT USING (true);

CREATE POLICY "Tenant admins can manage billing plans" ON public.billing_plans
  FOR ALL USING (
    tenant_id IN (
      SELECT user_tenants.tenant_id FROM user_tenants 
      WHERE user_tenants.user_id = auth.uid() 
      AND user_tenants.is_active = true 
      AND user_tenants.role IN ('admin', 'tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Tenant users can view their payments" ON public.payments
  FOR SELECT USING (
    tenant_id IN (
      SELECT user_tenants.tenant_id FROM user_tenants 
      WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
    )
  );

CREATE POLICY "Users can manage their email verifications" ON public.email_verifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their password reset requests" ON public.password_reset_requests
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_plans_tenant_id ON billing_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_plans_active ON billing_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_requests(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_requests(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_verifications_updated_at
  BEFORE UPDATE ON email_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_password_reset_requests_updated_at
  BEFORE UPDATE ON password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default billing plans
INSERT INTO billing_plans (name, description, base_price, price_monthly, price_quarterly, price_annually, billing_interval) VALUES
  ('Starter', 'Basic plan for small organizations', 99.00, 99.00, 279.00, 999.00, 'monthly'),
  ('Growth', 'Growing businesses with advanced features', 199.00, 199.00, 549.00, 1999.00, 'monthly'),
  ('Enterprise', 'Full-featured plan for large organizations', 499.00, 499.00, 1399.00, 4999.00, 'monthly'),
  ('Custom', 'Custom pricing for specific needs', 0.00, 0.00, 0.00, 0.00, 'monthly')
ON CONFLICT DO NOTHING;