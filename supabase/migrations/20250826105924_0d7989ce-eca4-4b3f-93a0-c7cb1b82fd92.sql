
-- Add missing settings column to tenant_branding table
ALTER TABLE public.tenant_branding 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- Create missing tables for onboarding data persistence

-- Table for storing domain and whitelabel configurations
CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  custom_domain text,
  subdomain text,
  ssl_enabled boolean DEFAULT false,
  domain_verified boolean DEFAULT false,
  verification_token text,
  dns_records jsonb DEFAULT '{}',
  whitelabel_config jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS on tenant_domains
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_domains
CREATE POLICY "Tenant admins can manage domains" ON public.tenant_domains
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "Super admins can manage all domains" ON public.tenant_domains
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

-- Table for storing onboarding completion status
CREATE TABLE IF NOT EXISTS public.tenant_onboarding_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.onboarding_workflows(id) ON DELETE CASCADE,
  company_profile_completed boolean DEFAULT false,
  branding_completed boolean DEFAULT false,
  users_roles_completed boolean DEFAULT false,
  billing_completed boolean DEFAULT false,
  domain_completed boolean DEFAULT false,
  review_completed boolean DEFAULT false,
  overall_completion_percentage integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, workflow_id)
);

-- Enable RLS on tenant_onboarding_status
ALTER TABLE public.tenant_onboarding_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_onboarding_status
CREATE POLICY "Tenant users can view onboarding status" ON public.tenant_onboarding_status
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "System can manage onboarding status" ON public.tenant_onboarding_status
  FOR ALL USING (true);

-- Add updated_at trigger for tenant_domains
CREATE OR REPLACE FUNCTION update_tenant_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_domains_updated_at
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_domains_updated_at();

-- Add updated_at trigger for tenant_onboarding_status
CREATE OR REPLACE FUNCTION update_tenant_onboarding_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_onboarding_status_updated_at
  BEFORE UPDATE ON public.tenant_onboarding_status
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_onboarding_status_updated_at();
