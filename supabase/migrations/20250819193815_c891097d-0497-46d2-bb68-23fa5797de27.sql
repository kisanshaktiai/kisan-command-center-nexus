
-- Create the system_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code TEXT UNIQUE NOT NULL,
  role_name TEXT NOT NULL,
  role_description TEXT,
  role_level INTEGER NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert the standard system roles
INSERT INTO public.system_roles (role_code, role_name, role_description, role_level, permissions, is_active, is_system_role) VALUES
  ('super_admin', 'Super Administrator', 'Full system access with all permissions', 100, ARRAY['system:*', 'tenant:*', 'user:*', 'billing:*', 'analytics:*'], true, true),
  ('platform_admin', 'Platform Administrator', 'Platform-wide administration with limited system access', 90, ARRAY['tenant:*', 'user:read', 'user:write', 'billing:read', 'analytics:read'], true, true),
  ('tenant_owner', 'Tenant Owner', 'Full ownership of tenant with billing and admin rights', 80, ARRAY['tenant:admin', 'user:*', 'billing:admin', 'analytics:admin', 'api:admin'], true, false),
  ('tenant_admin', 'Tenant Administrator', 'Full tenant administration without billing access', 70, ARRAY['tenant:admin', 'user:*', 'analytics:read', 'api:write'], true, false),
  ('tenant_manager', 'Tenant Manager', 'Tenant management with limited user permissions', 60, ARRAY['tenant:write', 'user:read', 'user:write', 'analytics:read'], true, false),
  ('dealer', 'Dealer', 'Product dealer with sales and customer management', 40, ARRAY['products:read', 'customers:write', 'orders:write', 'commission:read'], true, false),
  ('agent', 'Field Agent', 'Field operations and farmer support', 35, ARRAY['farmers:read', 'farmers:write', 'tasks:write', 'reports:read'], true, false),
  ('farmer', 'Farmer', 'End user farmer with basic platform access', 20, ARRAY['profile:write', 'crops:write', 'weather:read', 'marketplace:read'], true, false),
  ('tenant_user', 'Tenant User', 'Basic tenant user with limited access', 10, ARRAY['profile:write', 'dashboard:read'], true, false)
ON CONFLICT (role_code) DO NOTHING;

-- Create or update the user_role enum to match system roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin', 
    'platform_admin', 
    'tenant_owner', 
    'tenant_admin', 
    'tenant_manager', 
    'dealer', 
    'agent', 
    'farmer', 
    'tenant_user'
  );
EXCEPTION
  WHEN duplicate_object THEN 
    -- If enum exists, we need to add new values if they don't exist
    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_admin';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tenant_owner';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tenant_admin';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tenant_manager';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dealer';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agent';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'farmer';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tenant_user';
    EXCEPTION
      WHEN others THEN NULL;
    END;
END $$;

-- Add foreign key constraint to user_tenants table if it doesn't exist
DO $$ BEGIN
  ALTER TABLE public.user_tenants 
  ADD CONSTRAINT fk_user_tenants_role 
  FOREIGN KEY (role) REFERENCES public.system_roles(role_code);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create helper functions to work with system roles
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role_code TEXT)
RETURNS TEXT[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT permissions FROM public.system_roles 
  WHERE role_code = p_role_code AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_role_level(p_role_code TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_level FROM public.system_roles 
  WHERE role_code = p_role_code AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.is_system_role_active(p_role_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.system_roles 
    WHERE role_code = p_role_code AND is_active = true
  );
$$;

-- Update existing helper functions to use system_roles table
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.role 
  FROM public.admin_users au
  JOIN public.system_roles sr ON au.role = sr.role_code
  WHERE au.id = auth.uid() 
    AND au.is_active = true 
    AND sr.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN public.system_roles sr ON au.role = sr.role_code
    WHERE au.id = auth.uid() 
      AND au.is_active = true 
      AND sr.role_code = 'super_admin'
      AND sr.is_active = true
  );
$$;

-- Add trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.update_system_roles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_system_roles_updated_at_trigger ON public.system_roles;
CREATE TRIGGER update_system_roles_updated_at_trigger
  BEFORE UPDATE ON public.system_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_roles_updated_at();

-- Enable RLS on system_roles table
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system_roles
DROP POLICY IF EXISTS "Public can view active system roles" ON public.system_roles;
CREATE POLICY "Public can view active system roles"
  ON public.system_roles
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage system roles" ON public.system_roles;
CREATE POLICY "Super admins can manage system roles"
  ON public.system_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN public.system_roles sr ON au.role = sr.role_code
      WHERE au.id = auth.uid() 
        AND au.is_active = true 
        AND sr.role_code = 'super_admin'
        AND sr.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN public.system_roles sr ON au.role = sr.role_code
      WHERE au.id = auth.uid() 
        AND au.is_active = true 
        AND sr.role_code = 'super_admin'
        AND sr.is_active = true
    )
  );
