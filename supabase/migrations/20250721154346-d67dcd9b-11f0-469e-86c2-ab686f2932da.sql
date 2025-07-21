
-- Create domain_mappings table for centralized domain routing
CREATE TABLE domain_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  tenant_id uuid REFERENCES tenants(id),
  portal_mappings jsonb DEFAULT '{}',
  ssl_status text DEFAULT 'pending',
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for fast domain lookups
CREATE INDEX idx_domain_mappings_domain ON domain_mappings(domain);

-- Add RLS policies for domain_mappings
ALTER TABLE domain_mappings ENABLE ROW LEVEL SECURITY;

-- Super admin bypass policy
CREATE POLICY "super_admin_bypass"
ON domain_mappings
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

-- Tenant admin access policy
CREATE POLICY "tenant_admin_access"
ON domain_mappings
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT user_tenants.tenant_id
    FROM user_tenants
    WHERE user_tenants.user_id = auth.uid()
    AND user_tenants.is_active = true
    AND user_tenants.role IN ('tenant_owner', 'tenant_admin')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_domain_mappings_updated_at
  BEFORE UPDATE ON domain_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
