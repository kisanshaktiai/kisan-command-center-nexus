
-- Fix onboarding workflows RLS policies and admin user setup

-- First, ensure the current user is added as a super admin
INSERT INTO admin_users (id, email, full_name, role, is_active) 
VALUES (
  'afddb8de-bd12-4fa0-9a97-9c8de1085c99',
  'kisanshaktiai@gmail.com',
  'KisanShakti Admin',
  'super_admin',
  true
) ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = now();

-- Update RLS policies for onboarding_workflows to allow super admins
DROP POLICY IF EXISTS "Users can manage their tenant onboarding workflows" ON public.onboarding_workflows;
DROP POLICY IF EXISTS "super_admin_bypass" ON public.onboarding_workflows;

-- Create super admin bypass policy
CREATE POLICY "super_admin_bypass" ON public.onboarding_workflows
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin')
    AND is_active = true
  )
);

-- Create tenant user policy for regular users
CREATE POLICY "tenant_users_manage_workflows" ON public.onboarding_workflows
FOR ALL 
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Update RLS policies for onboarding_steps
DROP POLICY IF EXISTS "Users can manage their tenant onboarding steps" ON public.onboarding_steps;
DROP POLICY IF EXISTS "super_admin_bypass" ON public.onboarding_steps;

-- Create super admin bypass policy for steps
CREATE POLICY "super_admin_bypass" ON public.onboarding_steps
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'platform_admin')
    AND is_active = true
  )
);

-- Create tenant user policy for steps
CREATE POLICY "tenant_users_manage_steps" ON public.onboarding_steps
FOR ALL 
TO authenticated
USING (
  workflow_id IN (
    SELECT id FROM onboarding_workflows 
    WHERE tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Grant necessary permissions
GRANT ALL ON onboarding_workflows TO authenticated;
GRANT ALL ON onboarding_steps TO authenticated;
