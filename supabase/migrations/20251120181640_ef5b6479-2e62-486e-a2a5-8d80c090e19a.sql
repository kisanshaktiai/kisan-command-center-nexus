-- Phase 1: Add domain_config column to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS domain_config JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_tenants_domain_config ON tenants USING GIN (domain_config);

-- Add specific indexes for common domain queries
CREATE INDEX IF NOT EXISTS idx_tenants_public_website_domain 
ON tenants ((domain_config->'public_website'->>'custom_domain'));

CREATE INDEX IF NOT EXISTS idx_tenants_tenant_portal_domain 
ON tenants ((domain_config->'tenant_portal'->>'custom_domain'));

CREATE INDEX IF NOT EXISTS idx_tenants_farmer_app_domain 
ON tenants ((domain_config->'farmer_app'->>'custom_domain'));

-- Migration function to populate domain_config from legacy columns
CREATE OR REPLACE FUNCTION migrate_tenant_domains()
RETURNS void AS $$
DECLARE
  tenant_record RECORD;
  new_domain_config JSONB;
BEGIN
  FOR tenant_record IN 
    SELECT id, subdomain, custom_domain, metadata 
    FROM tenants 
    WHERE domain_config IS NULL OR domain_config = '{}'::jsonb
  LOOP
    -- Build new domain_config structure
    new_domain_config := jsonb_build_object(
      'public_website', jsonb_build_object(
        'custom_domain', COALESCE(tenant_record.custom_domain, ''),
        'ssl_enabled', true,
        'dns_verified', false,
        'status', CASE 
          WHEN tenant_record.custom_domain IS NOT NULL AND tenant_record.custom_domain != '' THEN 'pending'
          ELSE 'not_configured'
        END
      ),
      'tenant_portal', jsonb_build_object(
        'custom_domain', CASE 
          WHEN tenant_record.subdomain IS NOT NULL AND tenant_record.subdomain != '' 
               AND tenant_record.custom_domain IS NOT NULL AND tenant_record.custom_domain != ''
          THEN concat(tenant_record.subdomain, '.', tenant_record.custom_domain)
          ELSE ''
        END,
        'ssl_enabled', true,
        'dns_verified', false,
        'status', CASE 
          WHEN tenant_record.subdomain IS NOT NULL AND tenant_record.subdomain != '' THEN 'pending'
          ELSE 'not_configured'
        END
      ),
      'farmer_app', jsonb_build_object(
        'custom_domain', '',
        'ssl_enabled', true,
        'dns_verified', false,
        'status', 'not_configured'
      )
    );

    -- Update tenant with new domain_config
    UPDATE tenants 
    SET domain_config = new_domain_config,
        updated_at = now()
    WHERE id = tenant_record.id;
    
    RAISE NOTICE 'Migrated domain config for tenant: %', tenant_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to keep legacy columns in sync with domain_config
CREATE OR REPLACE FUNCTION sync_legacy_domain_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if domain_config is not empty
  IF NEW.domain_config IS NOT NULL AND NEW.domain_config != '{}'::jsonb THEN
    -- Extract from domain_config and update legacy columns
    NEW.custom_domain := NEW.domain_config->'public_website'->>'custom_domain';
    
    -- Extract subdomain prefix from tenant_portal
    IF NEW.domain_config->'tenant_portal'->>'custom_domain' IS NOT NULL 
       AND NEW.domain_config->'tenant_portal'->>'custom_domain' != ''
       AND NEW.custom_domain IS NOT NULL 
       AND NEW.custom_domain != '' THEN
      NEW.subdomain := regexp_replace(
        NEW.domain_config->'tenant_portal'->>'custom_domain',
        concat('\.', regexp_replace(NEW.custom_domain, '([.?*+^$[\]\\(){}|-])', '\\\1', 'g'), '$'),
        ''
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for syncing legacy columns
DROP TRIGGER IF EXISTS trigger_sync_legacy_domain_columns ON tenants;
CREATE TRIGGER trigger_sync_legacy_domain_columns
  BEFORE INSERT OR UPDATE OF domain_config ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION sync_legacy_domain_columns();

-- Run the migration for existing tenants
SELECT migrate_tenant_domains();

-- Add comment for documentation
COMMENT ON COLUMN tenants.domain_config IS 'Triple domain configuration (public_website, tenant_portal, farmer_app) with SSL and DNS status';
COMMENT ON COLUMN tenants.subdomain IS 'LEGACY: Kept for backward compatibility, auto-synced from domain_config';
COMMENT ON COLUMN tenants.custom_domain IS 'LEGACY: Kept for backward compatibility, auto-synced from domain_config';