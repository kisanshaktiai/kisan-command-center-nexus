-- Add API source tracking to satellite_tiles
ALTER TABLE satellite_tiles 
ADD COLUMN IF NOT EXISTS api_source TEXT DEFAULT 'planetary_computer' 
CHECK (api_source IN ('planetary_computer', 'copernicus_sentinel_hub'));

-- Create system-wide satellite API configuration table
CREATE TABLE IF NOT EXISTS system_satellite_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  preferred_api_source TEXT DEFAULT 'planetary_computer' 
    CHECK (preferred_api_source IN ('planetary_computer', 'copernicus_sentinel_hub')),
  copernicus_client_id TEXT,
  copernicus_client_secret TEXT,
  fallback_enabled BOOLEAN DEFAULT true,
  auto_switch_on_failure BOOLEAN DEFAULT true,
  max_retries_per_source INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Create satellite API usage tracking table
CREATE TABLE IF NOT EXISTS satellite_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  api_source TEXT NOT NULL CHECK (api_source IN ('planetary_computer', 'copernicus_sentinel_hub')),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('search', 'download', 'process')),
  tiles_processed INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  total_cost_estimate NUMERIC(10,2) DEFAULT 0,
  bandwidth_mb NUMERIC(10,2) DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_satellite_api_usage_tenant_date 
  ON satellite_api_usage(tenant_id, date, api_source);

-- Add trigger for updating system_satellite_config updated_at
CREATE OR REPLACE FUNCTION update_system_satellite_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_satellite_config_updated_at
  BEFORE UPDATE ON system_satellite_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_satellite_config_updated_at();

-- Enable RLS on new tables
ALTER TABLE system_satellite_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE satellite_api_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_satellite_config
CREATE POLICY "Super admins can manage satellite config"
  ON system_satellite_config FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Tenant admins can view their satellite config"
  ON system_satellite_config FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

-- RLS policies for satellite_api_usage
CREATE POLICY "Super admins can view all API usage"
  ON satellite_api_usage FOR SELECT
  USING (is_super_admin());

CREATE POLICY "Tenant admins can view their API usage"
  ON satellite_api_usage FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('tenant_owner', 'tenant_admin')
    )
  );

CREATE POLICY "System can insert API usage"
  ON satellite_api_usage FOR INSERT
  WITH CHECK (true);