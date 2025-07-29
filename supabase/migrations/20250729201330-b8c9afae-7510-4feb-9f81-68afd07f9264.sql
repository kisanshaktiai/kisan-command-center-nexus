-- Enable RLS specifically on our newly created monitoring tables if not already enabled
-- This addresses the critical security issue safely

-- Check and enable RLS on system_health_metrics if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'system_health_metrics' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Add policy for super admins to access all data
        CREATE POLICY "Super admins can access all system metrics" 
        ON public.system_health_metrics 
        FOR ALL 
        USING (is_authenticated_admin());
    END IF;
END $$;

-- Check and enable RLS on resource_utilization if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'resource_utilization' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE public.resource_utilization ENABLE ROW LEVEL SECURITY;
        
        -- Add policy for super admins to access all data
        CREATE POLICY "Super admins can access all resource metrics" 
        ON public.resource_utilization 
        FOR ALL 
        USING (is_authenticated_admin());
    END IF;
END $$;

-- Check and enable RLS on financial_analytics if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'financial_analytics' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE public.financial_analytics ENABLE ROW LEVEL SECURITY;
        
        -- Add policy for super admins to access all data
        CREATE POLICY "Super admins can access all financial metrics" 
        ON public.financial_analytics 
        FOR ALL 
        USING (is_authenticated_admin());
    END IF;
END $$;