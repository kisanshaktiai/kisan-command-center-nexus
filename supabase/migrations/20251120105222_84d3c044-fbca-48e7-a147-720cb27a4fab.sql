-- ============================================
-- White Label Sync: Database-Level Triggers
-- ============================================
-- Makes white_label_configs the source of truth
-- Automatically syncs changes to tenants table

-- Function to sync white_label_configs changes to tenants table
CREATE OR REPLACE FUNCTION sync_white_label_to_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract domain config and sync to tenant
  UPDATE tenants
  SET
    subdomain = COALESCE(
      (NEW.domain_config::jsonb)->>'subdomain',
      subdomain
    ),
    custom_domain = COALESCE(
      (NEW.domain_config::jsonb)->>'custom_domain',
      custom_domain
    ),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{branding_synced_from_wl}',
      'true'::jsonb
    ),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{branding_sync_at}',
      to_jsonb(now()::text)
    ),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{white_label_config_id}',
      to_jsonb(NEW.id::text)
    ),
    updated_at = now()
  WHERE id = NEW.tenant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for INSERT and UPDATE on white_label_configs
DROP TRIGGER IF EXISTS sync_white_label_configs_to_tenant ON white_label_configs;
CREATE TRIGGER sync_white_label_configs_to_tenant
  AFTER INSERT OR UPDATE ON white_label_configs
  FOR EACH ROW
  EXECUTE FUNCTION sync_white_label_to_tenant();

-- Function to handle white_label_configs deletion
CREATE OR REPLACE FUNCTION handle_white_label_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Clear tenant branding data when white_label_config is deleted
  UPDATE tenants
  SET
    subdomain = NULL,
    custom_domain = NULL,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{branding_synced_from_wl}',
      'false'::jsonb
    ),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{branding_deleted_at}',
      to_jsonb(now()::text)
    ),
    updated_at = now()
  WHERE id = OLD.tenant_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for DELETE on white_label_configs
DROP TRIGGER IF EXISTS handle_white_label_configs_deletion ON white_label_configs;
CREATE TRIGGER handle_white_label_configs_deletion
  AFTER DELETE ON white_label_configs
  FOR EACH ROW
  EXECUTE FUNCTION handle_white_label_deletion();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_white_label_configs_tenant_id 
  ON white_label_configs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenants_metadata_gin 
  ON tenants USING gin(metadata);

-- Add comments for documentation
COMMENT ON FUNCTION sync_white_label_to_tenant() IS 
  'Automatically syncs white_label_configs changes to tenants table (subdomain, custom_domain). 
   Makes white_label_configs the source of truth for branding data.
   Executed on INSERT and UPDATE operations.';

COMMENT ON FUNCTION handle_white_label_deletion() IS 
  'Clears tenant branding data when white_label_config is deleted.
   Ensures data consistency on DELETE operations.';

COMMENT ON TRIGGER sync_white_label_configs_to_tenant ON white_label_configs IS 
  'Triggers automatic sync from white_label_configs to tenants on INSERT/UPDATE';

COMMENT ON TRIGGER handle_white_label_configs_deletion ON white_label_configs IS 
  'Triggers branding data cleanup in tenants table on DELETE';