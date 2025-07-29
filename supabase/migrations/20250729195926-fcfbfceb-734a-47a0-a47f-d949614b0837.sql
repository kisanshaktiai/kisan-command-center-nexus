-- Create missing tables for monitoring and feature flags
-- CRITICAL: Creating infrastructure tables with extreme caution

-- 1. Feature Flags table (referenced in FeatureFlags component but missing)
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_tenants UUID[] DEFAULT '{}',
    target_users UUID[] DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 2. System Health Metrics table (for monitoring dashboards)
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT,
    labels JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Resource Utilization table (for resource monitoring)
CREATE TABLE IF NOT EXISTS public.resource_utilization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    resource_type TEXT NOT NULL, -- 'cpu', 'memory', 'storage', 'api_calls'
    current_usage NUMERIC NOT NULL DEFAULT 0,
    max_limit NUMERIC,
    usage_percentage NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN max_limit > 0 THEN (current_usage / max_limit * 100)
            ELSE 0 
        END
    ) STORED,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Financial Analytics table (for billing monitoring)
CREATE TABLE IF NOT EXISTS public.financial_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    metric_type TEXT NOT NULL, -- 'revenue', 'mrr', 'churn', 'ltv'
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    period_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_utilization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_flags (Super admin only)
CREATE POLICY "Super admins can manage feature flags" 
ON public.feature_flags 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- RLS Policies for system_health_metrics
CREATE POLICY "Super admins can access all system metrics" 
ON public.system_health_metrics 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Tenant admins can view their metrics" 
ON public.system_health_metrics 
FOR SELECT 
USING (
    tenant_id IN (
        SELECT user_tenants.tenant_id 
        FROM user_tenants 
        WHERE user_tenants.user_id = auth.uid() 
        AND user_tenants.is_active = true 
        AND user_tenants.role IN ('tenant_admin', 'tenant_owner')
    )
);

-- RLS Policies for resource_utilization
CREATE POLICY "Super admins can access all resource data" 
ON public.resource_utilization 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Tenant admins can view their resource usage" 
ON public.resource_utilization 
FOR SELECT 
USING (
    tenant_id IN (
        SELECT user_tenants.tenant_id 
        FROM user_tenants 
        WHERE user_tenants.user_id = auth.uid() 
        AND user_tenants.is_active = true 
        AND user_tenants.role IN ('tenant_admin', 'tenant_owner')
    )
);

-- RLS Policies for financial_analytics
CREATE POLICY "Super admins can access all financial data" 
ON public.financial_analytics 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Tenant owners can view their financial data" 
ON public.financial_analytics 
FOR SELECT 
USING (
    tenant_id IN (
        SELECT user_tenants.tenant_id 
        FROM user_tenants 
        WHERE user_tenants.user_id = auth.uid() 
        AND user_tenants.is_active = true 
        AND user_tenants.role = 'tenant_owner'
    )
);

-- Add foreign key constraints
ALTER TABLE public.system_health_metrics 
ADD CONSTRAINT system_health_metrics_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.resource_utilization 
ADD CONSTRAINT resource_utilization_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.financial_analytics 
ADD CONSTRAINT financial_analytics_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_feature_flags_flag_name ON public.feature_flags(flag_name);
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags(is_enabled);
CREATE INDEX idx_system_health_metrics_tenant_timestamp ON public.system_health_metrics(tenant_id, timestamp);
CREATE INDEX idx_resource_utilization_tenant_period ON public.resource_utilization(tenant_id, period_start, period_end);
CREATE INDEX idx_financial_analytics_tenant_period ON public.financial_analytics(tenant_id, period_start, period_end);

-- Add update triggers
CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_resource_utilization_updated_at
    BEFORE UPDATE ON public.resource_utilization
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_financial_analytics_updated_at
    BEFORE UPDATE ON public.financial_analytics
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();