-- Phase 4: Clean Up Corrupt Data (Fixed with PWA config)

-- Fix corrupt subdomain for "KisanShakti Ai" tenant
UPDATE tenants
SET subdomain = 'app'
WHERE id = 'a2a59533-b5d2-450c-bd70-7180aa40d82d'
  AND subdomain = 'An internal error occurred';

-- Create missing white_label_configs for out-of-sync tenants
-- These will automatically sync to tenants table via triggers

-- Create config for "aptech agritech"
INSERT INTO white_label_configs (tenant_id, domain_config, brand_identity, pwa_config, is_active)
VALUES (
  'babc6308-beb6-4406-9194-f1aeefabbc5f',
  jsonb_build_object(
    'subdomain', 'aptechagri',
    'custom_domain', NULL,
    'ssl_enabled', true
  ),
  jsonb_build_object(
    'company_name', 'aptech agritech',
    'app_name', 'aptech agritech'
  ),
  jsonb_build_object(
    'name', 'aptech agritech',
    'short_name', 'aptech agritech',
    'display', 'standalone',
    'orientation', 'portrait'
  ),
  true
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Create config for "New Kisanshakti Ai"
INSERT INTO white_label_configs (tenant_id, domain_config, brand_identity, pwa_config, is_active)
VALUES (
  '995717a3-8f80-475d-bb67-b5ec643fe349',
  jsonb_build_object(
    'subdomain', NULL,
    'custom_domain', NULL,
    'ssl_enabled', false
  ),
  jsonb_build_object(
    'company_name', 'New Kisanshakti Ai',
    'app_name', 'New Kisanshakti Ai'
  ),
  jsonb_build_object(
    'name', 'New Kisanshakti Ai',
    'short_name', 'New Kisanshakti Ai',
    'display', 'standalone',
    'orientation', 'portrait'
  ),
  true
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Create config for "Ai Shakti Kisan"
INSERT INTO white_label_configs (tenant_id, domain_config, brand_identity, pwa_config, is_active)
VALUES (
  'b5c63052-3741-4683-b623-507c332fadcf',
  jsonb_build_object(
    'subdomain', NULL,
    'custom_domain', NULL,
    'ssl_enabled', false
  ),
  jsonb_build_object(
    'company_name', 'Ai Shakti Kisan',
    'app_name', 'Ai Shakti Kisan'
  ),
  jsonb_build_object(
    'name', 'Ai Shakti Kisan',
    'short_name', 'Ai Shakti Kisan',
    'display', 'standalone',
    'orientation', 'portrait'
  ),
  true
)
ON CONFLICT (tenant_id) DO NOTHING;