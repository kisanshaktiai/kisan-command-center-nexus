
-- Add Super Admin Bypass Policies
-- Enable super_admin and platform_admin to bypass RLS for all tables

-- Tenants table
DROP POLICY IF EXISTS "super_admin_bypass" ON tenants;
CREATE POLICY "super_admin_bypass"
ON tenants
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

-- Tenant branding table
DROP POLICY IF EXISTS "super_admin_bypass" ON tenant_branding;
CREATE POLICY "super_admin_bypass"
ON tenant_branding
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

-- Tenant features table
DROP POLICY IF EXISTS "super_admin_bypass" ON tenant_features;
CREATE POLICY "super_admin_bypass"
ON tenant_features
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

-- Admin users table (already has admin access policy, but ensuring consistency)
DROP POLICY IF EXISTS "super_admin_bypass" ON admin_users;
CREATE POLICY "super_admin_bypass"
ON admin_users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.id = auth.uid() 
    AND au.role IN ('super_admin', 'platform_admin')
    AND au.is_active = true
  )
);
