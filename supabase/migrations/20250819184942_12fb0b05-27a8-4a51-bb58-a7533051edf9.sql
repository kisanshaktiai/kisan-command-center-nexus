
-- Create a centralized roles table for world-class SaaS platform
CREATE TABLE public.system_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  role_description TEXT,
  role_level INTEGER NOT NULL DEFAULT 0,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert world-class SaaS platform roles
INSERT INTO public.system_roles (role_code, role_name, role_description, role_level, permissions, is_system_role) VALUES
-- System Level Roles (Level 100+)
('super_admin', 'Super Administrator', 'Full system access with all permissions', 100, '["system:*", "tenant:*", "user:*", "billing:*", "analytics:*"]'::jsonb, true),
('platform_admin', 'Platform Administrator', 'Platform-wide administration with limited system access', 90, '["tenant:*", "user:read", "user:write", "billing:read", "analytics:read"]'::jsonb, true),

-- Tenant Level Roles (Level 50-89)
('tenant_owner', 'Tenant Owner', 'Full ownership of tenant with billing and admin rights', 80, '["tenant:admin", "user:*", "billing:admin", "analytics:admin", "api:admin"]'::jsonb, false),
('tenant_admin', 'Tenant Administrator', 'Full tenant administration without billing access', 70, '["tenant:admin", "user:*", "analytics:read", "api:write"]'::jsonb, false),
('tenant_manager', 'Tenant Manager', 'Tenant management with limited user permissions', 60, '["tenant:write", "user:read", "user:write", "analytics:read"]'::jsonb, false),

-- Operational Roles (Level 30-49)
('dealer', 'Dealer', 'Product dealer with sales and customer management', 40, '["products:read", "customers:write", "orders:write", "commission:read"]'::jsonb, false),
('agent', 'Field Agent', 'Field operations and farmer support', 35, '["farmers:read", "farmers:write", "tasks:write", "reports:read"]'::jsonb, false),

-- End User Roles (Level 10-29)
('farmer', 'Farmer', 'End user farmer with basic platform access', 20, '["profile:write", "crops:write", "weather:read", "marketplace:read"]'::jsonb, false),
('tenant_user', 'Tenant User', 'Basic tenant user with limited access', 10, '["profile:write", "dashboard:read"]'::jsonb, false);

-- Create indexes for better performance
CREATE INDEX idx_system_roles_code ON public.system_roles(role_code);
CREATE INDEX idx_system_roles_level ON public.system_roles(role_level);
CREATE INDEX idx_system_roles_active ON public.system_roles(is_active);

-- Update user_tenants table to use role_code from system_roles
ALTER TABLE public.user_tenants DROP CONSTRAINT IF EXISTS user_tenants_role_check;
ALTER TABLE public.user_tenants 
  ALTER COLUMN role TYPE VARCHAR(50),
  ADD CONSTRAINT fk_user_tenants_role 
    FOREIGN KEY (role) REFERENCES public.system_roles(role_code);

-- Update admin_users table to use role_code from system_roles  
ALTER TABLE public.admin_users 
  ALTER COLUMN role TYPE VARCHAR(50),
  ADD CONSTRAINT fk_admin_users_role 
    FOREIGN KEY (role) REFERENCES public.system_roles(role_code);

-- Add RLS policies for system_roles table
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active roles" ON public.system_roles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage all roles" ON public.system_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

-- Create a function to get user role details
CREATE OR REPLACE FUNCTION public.get_user_role_details(p_user_id uuid, p_tenant_id uuid DEFAULT NULL)
RETURNS TABLE(
  role_code VARCHAR(50),
  role_name VARCHAR(100), 
  role_level INTEGER,
  permissions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin users first
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = p_user_id AND is_active = true) THEN
    RETURN QUERY
    SELECT sr.role_code, sr.role_name, sr.role_level, sr.permissions
    FROM public.admin_users au
    JOIN public.system_roles sr ON au.role = sr.role_code
    WHERE au.id = p_user_id AND au.is_active = true;
    RETURN;
  END IF;
  
  -- Check tenant users
  IF p_tenant_id IS NOT NULL THEN
    RETURN QUERY
    SELECT sr.role_code, sr.role_name, sr.role_level, sr.permissions
    FROM public.user_tenants ut
    JOIN public.system_roles sr ON ut.role = sr.role_code
    WHERE ut.user_id = p_user_id 
    AND ut.tenant_id = p_tenant_id 
    AND ut.is_active = true
    ORDER BY sr.role_level DESC
    LIMIT 1;
  END IF;
END;
$$;

-- Create a function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id uuid, 
  p_permission text, 
  p_tenant_id uuid DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permissions JSONB;
  perm text;
BEGIN
  SELECT permissions INTO user_permissions
  FROM public.get_user_role_details(p_user_id, p_tenant_id);
  
  IF user_permissions IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check for wildcard permissions
  FOR perm IN SELECT jsonb_array_elements_text(user_permissions)
  LOOP
    IF perm = p_permission OR 
       (perm LIKE '%:*' AND p_permission LIKE (replace(perm, '*', '') || '%'))
    THEN
      RETURN true;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$;

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_system_roles_updated_at 
  BEFORE UPDATE ON public.system_roles 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
