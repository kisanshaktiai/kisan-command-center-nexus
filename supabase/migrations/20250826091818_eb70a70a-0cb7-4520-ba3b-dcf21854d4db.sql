
-- Critical Fix: Add Missing Foreign Key Constraints and Tables
-- Based on the schema analysis, fixing critical gaps

-- 1. Add missing foreign key constraints to tenants table
ALTER TABLE public.tenants 
ADD CONSTRAINT IF NOT EXISTS fk_tenants_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Note: updated_by FK already exists from previous migration

-- 2. Create missing billing/payment tables referenced in edge functions

-- Create payment_records table (referenced in tenant-subscriptions-billing function)
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'bank_transfer', 'digital_wallet', 'other')),
    payment_provider TEXT,
    provider_transaction_id TEXT,
    provider_response JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table (referenced in tenant-subscriptions-billing function)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    invoice_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription_renewals table (referenced in tenant-subscriptions-billing function)
CREATE TABLE IF NOT EXISTS public.subscription_renewals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE,
    renewal_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed', 'cancelled')),
    previous_plan_id UUID REFERENCES public.billing_plans(id),
    new_plan_id UUID REFERENCES public.billing_plans(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_archive_jobs table (referenced in database functions)
CREATE TABLE IF NOT EXISTS public.tenant_archive_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    archive_location TEXT NOT NULL,
    encryption_key_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    archive_size_bytes BIGINT,
    error_details JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_records_tenant_id ON public.payment_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_subscription_id ON public.payment_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON public.payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_at ON public.payment_records(created_at);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_subscription_renewals_tenant_id ON public.subscription_renewals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_renewals_subscription_id ON public.subscription_renewals(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_renewals_renewal_date ON public.subscription_renewals(renewal_date);
CREATE INDEX IF NOT EXISTS idx_subscription_renewals_status ON public.subscription_renewals(status);

CREATE INDEX IF NOT EXISTS idx_tenant_archive_jobs_tenant_id ON public.tenant_archive_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_archive_jobs_status ON public.tenant_archive_jobs(status);

-- 4. Add updated_at triggers for new tables
CREATE TRIGGER update_payment_records_updated_at 
    BEFORE UPDATE ON public.payment_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON public.invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_renewals_updated_at 
    BEFORE UPDATE ON public.subscription_renewals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_archive_jobs_updated_at 
    BEFORE UPDATE ON public.tenant_archive_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Add RLS policies for new tables
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_archive_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_records
CREATE POLICY "Tenant users can view their payment records" 
    ON public.payment_records FOR SELECT 
    USING (tenant_id IN (
        SELECT tenant_id FROM public.user_tenants 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "Super admins can manage all payment records" 
    ON public.payment_records FOR ALL 
    USING (is_super_admin());

-- RLS policies for invoices
CREATE POLICY "Tenant users can view their invoices" 
    ON public.invoices FOR SELECT 
    USING (tenant_id IN (
        SELECT tenant_id FROM public.user_tenants 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "Super admins can manage all invoices" 
    ON public.invoices FOR ALL 
    USING (is_super_admin());

-- RLS policies for subscription_renewals
CREATE POLICY "Tenant users can view their subscription renewals" 
    ON public.subscription_renewals FOR SELECT 
    USING (tenant_id IN (
        SELECT tenant_id FROM public.user_tenants 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "Super admins can manage all subscription renewals" 
    ON public.subscription_renewals FOR ALL 
    USING (is_super_admin());

-- RLS policies for tenant_archive_jobs
CREATE POLICY "Super admins can manage archive jobs" 
    ON public.tenant_archive_jobs FOR ALL 
    USING (is_super_admin());

-- 6. Fix existing foreign key constraint issues
-- Update tenant_subscriptions to ensure proper constraint name consistency
ALTER TABLE public.tenant_subscriptions 
DROP CONSTRAINT IF EXISTS fk_tenant_subscriptions_tenant_id;

ALTER TABLE public.tenant_subscriptions 
ADD CONSTRAINT fk_tenant_subscriptions_tenant_id 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) 
ON DELETE CASCADE;

-- 7. Add missing created_by foreign keys to other tables that reference users
ALTER TABLE public.api_keys 
ADD CONSTRAINT IF NOT EXISTS fk_api_keys_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.onboarding_workflows 
ADD CONSTRAINT IF NOT EXISTS fk_onboarding_workflows_created_by 
FOREIGN KEY (created_by) REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- 8. Add invoice number generation sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1000;

-- 9. Add helpful comments
COMMENT ON TABLE public.payment_records IS 'Payment transactions for tenant subscriptions';
COMMENT ON TABLE public.invoices IS 'Generated invoices for tenant billing';
COMMENT ON TABLE public.subscription_renewals IS 'Scheduled and completed subscription renewals';
COMMENT ON TABLE public.tenant_archive_jobs IS 'Jobs for archiving tenant data during deletion';

-- 10. Add tenant deletion cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_tenant_deletion(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- This function will be called before tenant deletion to ensure clean cascade
    -- Archive tenant data first if needed
    INSERT INTO public.tenant_archive_jobs (tenant_id, archive_location, status)
    VALUES (p_tenant_id, 'system_cleanup', 'completed');
    
    -- The actual deletion will be handled by CASCADE constraints
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Tenant cleanup prepared',
        'tenant_id', p_tenant_id
    );
END;
$$;
