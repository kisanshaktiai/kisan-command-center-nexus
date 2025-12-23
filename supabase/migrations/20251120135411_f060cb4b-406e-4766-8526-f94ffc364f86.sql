-- Phase 3: Fix Database Triggers - Resolve metadata assignment conflict

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS sync_white_label_configs_to_tenant ON white_label_configs;
DROP TRIGGER IF EXISTS handle_white_label_configs_deletion ON white_label_configs;
DROP FUNCTION IF EXISTS sync_white_label_to_tenant();
DROP FUNCTION IF EXISTS handle_white_label_deletion();

-- Fixed function to sync white_label_configs to tenants
CREATE OR REPLACE FUNCTION sync_white_label_to_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- Update tenant with data from white_label_configs (source of truth)
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
    -- Fix: Use jsonb_build_object to properly construct metadata
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'branding_synced_from_wl', true,
      'branding_sync_at', now()::text,
      'white_label_config_id', NEW.id::text
    ),
    updated_at = now()
  WHERE id = NEW.tenant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fixed function to handle white_label_config deletion
CREATE OR REPLACE FUNCTION handle_white_label_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Clear tenant branding when white_label_config is deleted
  UPDATE tenants
  SET
    subdomain = NULL,
    custom_domain = NULL,
    -- Fix: Use jsonb_build_object for metadata
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'branding_synced_from_wl', false,
      'branding_deleted_at', now()::text
    ),
    updated_at = now()
  WHERE id = OLD.tenant_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER sync_white_label_configs_to_tenant
  AFTER INSERT OR UPDATE ON white_label_configs
  FOR EACH ROW
  EXECUTE FUNCTION sync_white_label_to_tenant();

CREATE TRIGGER handle_white_label_configs_deletion
  AFTER DELETE ON white_label_configs
  FOR EACH ROW
  EXECUTE FUNCTION handle_white_label_deletion();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_white_label_configs_tenant_id 
  ON white_label_configs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenants_metadata_gin 
  ON tenants USING gin(metadata);