-- Fix RLS policies for tenant creation (part 2 - handle existing policies)

-- Drop existing policies for tenant_branding and tenant_features if they exist
DO $$ 
BEGIN
    -- Drop policies for tenant_branding if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_branding' AND policyname = 'Users can access their tenant branding') THEN
        DROP POLICY "Users can access their tenant branding" ON public.tenant_branding;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_branding' AND policyname = 'Super admins can manage all tenant branding') THEN
        DROP POLICY "Super admins can manage all tenant branding" ON public.tenant_branding;
    END IF;
    
    -- Drop policies for tenant_features if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_features' AND policyname = 'Users can access their tenant features') THEN
        DROP POLICY "Users can access their tenant features" ON public.tenant_features;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_features' AND policyname = 'Super admins can manage all tenant features') THEN
        DROP POLICY "Super admins can manage all tenant features" ON public.tenant_features;
    END IF;
END $$;

-- Ensure RLS is enabled on tenant_branding and tenant_features
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant_branding
CREATE POLICY "Super admins can manage all tenant branding" 
ON public.tenant_branding FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.is_active = true 
    AND admin_users.role IN ('super_admin', 'platform_admin')
  )
);

CREATE POLICY "Users can access their tenant branding" 
ON public.tenant_branding FOR ALL 
USING (
  tenant_id IN (
    SELECT user_tenants.tenant_id
    FROM user_tenants
    WHERE user_tenants.user_id = auth.uid() 
    AND user_tenants.is_active = true
  )
);

-- Create policies for tenant_features
CREATE POLICY "Super admins can manage all tenant features" 
ON public.tenant_features FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.is_active = true 
    AND admin_users.role IN ('super_admin', 'platform_admin')
  )
);

CREATE POLICY "Users can access their tenant features" 
ON public.tenant_features FOR ALL 
USING (
  tenant_id IN (
    SELECT user_tenants.tenant_id
    FROM user_tenants
    WHERE user_tenants.user_id = auth.uid() 
    AND user_tenants.is_active = true
  )
);