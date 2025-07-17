
-- Create billing_plans table
CREATE TABLE public.billing_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL DEFAULT 'starter',
  base_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'quarterly', 'annually')),
  trial_days INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}',
  usage_limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_subscriptions table
CREATE TABLE public.tenant_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  billing_plan_id UUID NOT NULL REFERENCES public.billing_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'suspended', 'past_due')),
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  trial_start DATE,
  trial_end DATE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method TEXT,
  transaction_id TEXT,
  gateway_response JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id),
  invoice_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  total_amount NUMERIC NOT NULL,
  amount_due NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  line_items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_records table
CREATE TABLE public.usage_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id),
  metric_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all billing tables
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_plans (publicly viewable, admin manageable)
CREATE POLICY "Anyone can view active billing plans" 
  ON public.billing_plans 
  FOR SELECT 
  USING (is_active = true AND is_public = true);

CREATE POLICY "Super admins can manage billing plans" 
  ON public.billing_plans 
  FOR ALL 
  USING ((auth.jwt() ->> 'email') LIKE '%admin%');

-- RLS policies for tenant_subscriptions
CREATE POLICY "Users can view their tenant subscriptions" 
  ON public.tenant_subscriptions 
  FOR SELECT 
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

CREATE POLICY "Users can manage their tenant subscriptions" 
  ON public.tenant_subscriptions 
  FOR ALL 
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

-- RLS policies for payments
CREATE POLICY "Users can view their tenant payments" 
  ON public.payments 
  FOR SELECT 
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

CREATE POLICY "Users can create payments for their tenant" 
  ON public.payments 
  FOR INSERT 
  WITH CHECK (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

-- RLS policies for invoices
CREATE POLICY "Users can view their tenant invoices" 
  ON public.invoices 
  FOR SELECT 
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

CREATE POLICY "Users can manage their tenant invoices" 
  ON public.invoices 
  FOR ALL 
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

-- RLS policies for usage_records
CREATE POLICY "Users can view their tenant usage records" 
  ON public.usage_records 
  FOR SELECT 
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

CREATE POLICY "Users can create usage records for their tenant" 
  ON public.usage_records 
  FOR INSERT 
  WITH CHECK (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() AND user_tenants.is_active = true
  ));

-- Create indexes for better performance
CREATE INDEX idx_tenant_subscriptions_tenant_id ON public.tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON public.tenant_subscriptions(status);
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_usage_records_tenant_id ON public.usage_records(tenant_id);
CREATE INDEX idx_usage_records_timestamp ON public.usage_records(timestamp);

-- Create trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON public.billing_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_subscriptions_updated_at BEFORE UPDATE ON public.tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
