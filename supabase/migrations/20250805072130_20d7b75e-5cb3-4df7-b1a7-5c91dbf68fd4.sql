
-- Add 'admin' to the admin_role enum type
ALTER TYPE admin_role ADD VALUE 'admin';

-- Update the is_authenticated_admin function to properly handle all admin roles
CREATE OR REPLACE FUNCTION public.is_authenticated_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true
    LIMIT 1;
    
    RETURN user_role IN ('super_admin', 'platform_admin', 'admin', 'support_admin', 'security_admin');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$function$

-- Update get_current_admin_role function for consistency
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT role FROM public.admin_users 
  WHERE id = auth.uid() 
  AND is_active = true
  LIMIT 1;
$function$

-- Create missing tables if they don't exist (for metrics queries)
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  unit text,
  status text DEFAULT 'healthy',
  metadata jsonb DEFAULT '{}',
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resource_utilization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  resource_type text NOT NULL,
  current_usage numeric NOT NULL,
  max_limit numeric,
  usage_percentage numeric,
  threshold numeric DEFAULT 80,
  status text DEFAULT 'normal',
  metadata jsonb DEFAULT '{}',
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the new tables
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_utilization ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system_health_metrics
DROP POLICY IF EXISTS "super_admin_access" ON public.system_health_metrics;
CREATE POLICY "super_admin_access" ON public.system_health_metrics
  FOR ALL USING (is_authenticated_admin());

-- Create RLS policies for resource_utilization
DROP POLICY IF EXISTS "super_admin_access" ON public.resource_utilization;
CREATE POLICY "super_admin_access" ON public.resource_utilization
  FOR ALL USING (is_authenticated_admin());

-- Insert some sample data to prevent empty result sets
INSERT INTO public.system_health_metrics (metric_name, metric_value, unit, status, metadata) VALUES
  ('cpu_usage', 45.2, 'percent', 'healthy', '{"source": "system"}'),
  ('memory_usage', 67.8, 'percent', 'healthy', '{"source": "system"}'),
  ('disk_usage', 23.1, 'percent', 'healthy', '{"source": "system"}'),
  ('api_response_time', 120, 'milliseconds', 'healthy', '{"source": "system"}'),
  ('database_connections', 25, 'count', 'healthy', '{"source": "system"}')
ON CONFLICT DO NOTHING;

INSERT INTO public.resource_utilization (resource_type, current_usage, max_limit, usage_percentage, status) VALUES
  ('CPU', 45.2, 100, 45.2, 'normal'),
  ('Memory', 67.8, 100, 67.8, 'normal'),
  ('Disk', 23.1, 100, 23.1, 'normal'),
  ('Network', 15.5, 100, 15.5, 'normal'),
  ('API Calls', 1250, 10000, 12.5, 'normal')
ON CONFLICT DO NOTHING;
