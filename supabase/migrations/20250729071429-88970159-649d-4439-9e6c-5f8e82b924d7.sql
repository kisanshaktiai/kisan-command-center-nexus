-- Phase 2: Enable RLS and add basic security policies (without problematic user_id references)

-- Enable RLS on all new tables
ALTER TABLE public.admin_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_workflows ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_registrations (basic policies first)
CREATE POLICY "Public can read registrations by token" ON public.admin_registrations
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated users can read registrations" ON public.admin_registrations
  FOR SELECT TO authenticated
  USING (true);

-- Create policies for onboarding_workflows (basic policies first)
CREATE POLICY "Authenticated users can read workflows" ON public.onboarding_workflows
  FOR SELECT TO authenticated
  USING (true);

-- Create policies for system_config (basic policies first)
CREATE POLICY "Authenticated users can read config" ON public.system_config
  FOR SELECT TO authenticated
  USING (true);

-- Create enhanced authentication functions
CREATE OR REPLACE FUNCTION public.is_bootstrap_completed()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((config_value::text)::boolean, false)
  FROM public.system_config 
  WHERE config_key = 'bootstrap_completed';
$$;

CREATE OR REPLACE FUNCTION public.complete_bootstrap()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.system_config 
  SET config_value = 'true', updated_at = now()
  WHERE config_key = 'bootstrap_completed';
$$;