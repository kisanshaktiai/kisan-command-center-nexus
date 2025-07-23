
-- Create invoices table for tracking billing invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  paid_date DATE,
  stripe_invoice_id TEXT,
  paypal_invoice_id TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment records table
CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT, -- 'stripe', 'paypal', 'manual'
  transaction_id TEXT,
  gateway_response JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription renewals tracking table
CREATE TABLE public.subscription_renewals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.tenant_subscriptions(id),
  renewal_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'cancelled')),
  stripe_subscription_id TEXT,
  paypal_subscription_id TEXT,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  notification_sent BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_payment_records_tenant_id ON public.payment_records(tenant_id);
CREATE INDEX idx_payment_records_status ON public.payment_records(status);
CREATE INDEX idx_subscription_renewals_tenant_id ON public.subscription_renewals(tenant_id);
CREATE INDEX idx_subscription_renewals_date ON public.subscription_renewals(renewal_date);

-- Enable RLS on all new tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_renewals ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Tenant users can view their invoices" ON public.invoices
FOR SELECT USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Super admins can manage all invoices" ON public.invoices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin') 
    AND is_active = true
  )
);

-- RLS policies for payment records
CREATE POLICY "Tenant users can view their payment records" ON public.payment_records
FOR SELECT USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Super admins can manage all payment records" ON public.payment_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin') 
    AND is_active = true
  )
);

-- RLS policies for subscription renewals
CREATE POLICY "Tenant users can view their subscription renewals" ON public.subscription_renewals
FOR SELECT USING (tenant_id IN (
  SELECT tenant_id FROM user_tenants 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Super admins can manage all subscription renewals" ON public.subscription_renewals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin') 
    AND is_active = true
  )
);

-- Create triggers for updated_at columns
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_records_updated_at
  BEFORE UPDATE ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_renewals_updated_at
  BEFORE UPDATE ON public.subscription_renewals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-disable tenant features when subscription expires
CREATE OR REPLACE FUNCTION disable_expired_tenant_features()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update tenant_features to disable features for expired subscriptions
  UPDATE tenant_features 
  SET 
    ai_chat = false,
    weather_forecast = false,
    marketplace = false,
    community_forum = false,
    satellite_imagery = false,
    soil_testing = false,
    drone_monitoring = false,
    iot_integration = false,
    ecommerce = false,
    payment_gateway = false,
    inventory_management = false,
    logistics_tracking = false,
    basic_analytics = false,
    advanced_analytics = false,
    predictive_analytics = false,
    custom_reports = false,
    api_access = false,
    webhook_support = false,
    third_party_integrations = false,
    white_label_mobile_app = false,
    updated_at = now()
  WHERE tenant_id IN (
    SELECT t.id 
    FROM tenants t
    JOIN tenant_subscriptions ts ON t.id = ts.tenant_id
    WHERE ts.current_period_end < CURRENT_DATE 
    AND ts.status = 'active'
  );
  
  -- Update subscription status to expired
  UPDATE tenant_subscriptions 
  SET 
    status = 'past_due',
    updated_at = now()
  WHERE current_period_end < CURRENT_DATE 
  AND status = 'active';
END;
$$;
