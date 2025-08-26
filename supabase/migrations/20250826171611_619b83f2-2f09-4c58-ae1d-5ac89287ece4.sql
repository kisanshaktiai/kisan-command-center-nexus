
-- Step 1: Create the missing user_invitations table with proper schema
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  invited_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tenant_user',
  invitation_type TEXT NOT NULL DEFAULT 'onboarding',
  status TEXT NOT NULL DEFAULT 'pending',
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Create the missing tenant_domains table
CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  subdomain TEXT,
  is_primary BOOLEAN DEFAULT false,
  domain_verified BOOLEAN DEFAULT false,
  ssl_enabled BOOLEAN DEFAULT false,
  verification_token TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Create the missing tenant_branding table referenced in code
CREATE TABLE IF NOT EXISTS public.tenant_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  app_name TEXT,
  app_tagline TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  background_color TEXT,
  text_color TEXT,
  font_family TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Enable RLS on new tables
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for user_invitations
CREATE POLICY "Tenant admins can manage invitations" 
  ON public.user_invitations 
  FOR ALL 
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() 
    AND user_tenants.is_active = true 
    AND user_tenants.role = ANY(ARRAY['tenant_owner'::user_role, 'tenant_admin'::user_role])
  ));

CREATE POLICY "Public can validate invitation tokens" 
  ON public.user_invitations 
  FOR SELECT 
  USING (invitation_token IS NOT NULL AND expires_at > now());

-- Step 6: Create RLS policies for tenant_domains
CREATE POLICY "Tenant users can manage their domains" 
  ON public.tenant_domains 
  FOR ALL 
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() 
    AND user_tenants.is_active = true
  ));

-- Step 7: Create RLS policies for tenant_branding
CREATE POLICY "Tenant users can manage their branding" 
  ON public.tenant_branding 
  FOR ALL 
  USING (tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() 
    AND user_tenants.is_active = true
  ));

-- Step 8: Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tenant_domains_updated_at
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tenant_branding_updated_at
  BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Step 9: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant_id ON public.user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant_id ON public.tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON public.tenant_domains(domain);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant_id ON public.tenant_branding(tenant_id);
