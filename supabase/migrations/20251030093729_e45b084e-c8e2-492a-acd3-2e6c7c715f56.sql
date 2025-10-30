-- Phase 1: Create Feature Flag Environment System (Fixed)

-- 1. Feature environments table
CREATE TABLE IF NOT EXISTS feature_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default environments
INSERT INTO feature_environments (name, description) VALUES
  ('production', 'Production environment'),
  ('staging', 'Staging environment'),
  ('development', 'Development environment')
ON CONFLICT (name) DO NOTHING;

-- 2. Enhance feature_flags table
ALTER TABLE feature_flags 
  ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES feature_environments(id),
  ADD COLUMN IF NOT EXISTS flag_type TEXT DEFAULT 'release' CHECK (flag_type IN ('release', 'experiment', 'operational', 'permission')),
  ADD COLUMN IF NOT EXISTS flag_status TEXT DEFAULT 'active' CHECK (flag_status IN ('active', 'archived', 'deprecated')),
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduling JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS variation_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_value JSONB DEFAULT 'false'::jsonb,
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb;

-- Set default environment for existing rows
UPDATE feature_flags 
SET environment_id = (SELECT id FROM feature_environments WHERE name = 'production')
WHERE environment_id IS NULL;

-- 3. Feature flag evaluations (audit trail)
CREATE TABLE IF NOT EXISTS feature_flag_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID,
  evaluated_value BOOLEAN,
  evaluation_reason TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flag_evals_flag ON feature_flag_evaluations(flag_id);
CREATE INDEX IF NOT EXISTS idx_flag_evals_tenant ON feature_flag_evaluations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_flag_evals_created ON feature_flag_evaluations(created_at);

-- 4. Feature flag audit log
CREATE TABLE IF NOT EXISTS feature_flag_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('created', 'enabled', 'disabled', 'updated', 'archived', 'rollout_changed', 'targeting_changed')),
  old_value JSONB,
  new_value JSONB,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flag_audit_flag ON feature_flag_audit_log(flag_id);
CREATE INDEX IF NOT EXISTS idx_flag_audit_created ON feature_flag_audit_log(created_at);

-- 5. Tenant feature overrides
CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  override_enabled BOOLEAN NOT NULL,
  override_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, flag_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_overrides_tenant ON tenant_feature_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_overrides_flag ON tenant_feature_overrides(flag_id);

-- 6. Feature flag analytics
CREATE TABLE IF NOT EXISTS feature_flag_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_evaluations BIGINT DEFAULT 0,
  enabled_count BIGINT DEFAULT 0,
  disabled_count BIGINT DEFAULT 0,
  unique_tenants INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(flag_id, date)
);

CREATE INDEX IF NOT EXISTS idx_flag_analytics_flag_date ON feature_flag_analytics(flag_id, date);

-- 7. Feature flag evaluation function
CREATE OR REPLACE FUNCTION evaluate_feature_flag(
  p_flag_name TEXT,
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  v_flag RECORD;
  v_override RECORD;
  v_result BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Get flag configuration for production environment
  SELECT * INTO v_flag
  FROM feature_flags
  WHERE flag_name = p_flag_name
    AND (environment_id IS NULL OR environment_id = (
      SELECT id FROM feature_environments WHERE name = 'production' LIMIT 1
    ))
    AND flag_status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    v_reason := 'flag_not_found';
    v_result := FALSE;
  ELSIF NOT v_flag.is_enabled THEN
    v_reason := 'flag_disabled';
    v_result := FALSE;
  ELSE
    -- Check for tenant override (highest priority)
    SELECT override_enabled INTO v_override
    FROM tenant_feature_overrides
    WHERE tenant_id = p_tenant_id
      AND flag_id = v_flag.id
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;

    IF FOUND THEN
      v_result := v_override.override_enabled;
      v_reason := 'tenant_override';
    ELSIF v_flag.target_tenants IS NOT NULL 
      AND jsonb_array_length(v_flag.target_tenants) > 0 
      AND NOT (v_flag.target_tenants @> jsonb_build_array(p_tenant_id::text)) THEN
      v_result := FALSE;
      v_reason := 'not_targeted';
    ELSE
      -- Apply rollout percentage using consistent hashing
      v_result := (('x' || md5(p_tenant_id::text || v_flag.flag_name))::bit(32)::bigint % 100) < v_flag.rollout_percentage;
      v_reason := 'rollout_percentage';
    END IF;
  END IF;

  -- Log evaluation (async, don't block on errors)
  BEGIN
    INSERT INTO feature_flag_evaluations (
      flag_id, tenant_id, user_id, evaluated_value, evaluation_reason, context
    ) VALUES (
      v_flag.id, p_tenant_id, p_user_id, v_result, v_reason, p_context
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently continue if logging fails
    NULL;
  END;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to log feature flag changes
CREATE OR REPLACE FUNCTION log_feature_flag_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO feature_flag_audit_log (flag_id, changed_by, action, new_value)
    VALUES (NEW.id, auth.uid(), 'created', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_enabled != NEW.is_enabled THEN
      INSERT INTO feature_flag_audit_log (flag_id, changed_by, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 
        CASE WHEN NEW.is_enabled THEN 'enabled' ELSE 'disabled' END,
        jsonb_build_object('is_enabled', OLD.is_enabled),
        jsonb_build_object('is_enabled', NEW.is_enabled));
    END IF;
    IF OLD.rollout_percentage != NEW.rollout_percentage THEN
      INSERT INTO feature_flag_audit_log (flag_id, changed_by, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'rollout_changed',
        jsonb_build_object('rollout_percentage', OLD.rollout_percentage),
        jsonb_build_object('rollout_percentage', NEW.rollout_percentage));
    END IF;
    IF OLD.target_tenants IS DISTINCT FROM NEW.target_tenants THEN
      INSERT INTO feature_flag_audit_log (flag_id, changed_by, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'targeting_changed',
        jsonb_build_object('target_tenants', OLD.target_tenants),
        jsonb_build_object('target_tenants', NEW.target_tenants));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO feature_flag_audit_log (flag_id, changed_by, action, old_value)
    VALUES (OLD.id, auth.uid(), 'archived', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS feature_flag_audit_trigger ON feature_flags;
CREATE TRIGGER feature_flag_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION log_feature_flag_changes();

-- 9. Create feature flags from tenant_features columns
INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, flag_type, created_at, updated_at)
SELECT 
  'ai_chat' as flag_name,
  'AI-powered chat assistant for tenant users' as description,
  true as is_enabled,
  100 as rollout_percentage,
  'release' as flag_type,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'ai_chat');

INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, flag_type, created_at, updated_at)
SELECT 
  'marketplace' as flag_name,
  'Access to marketplace features' as description,
  true as is_enabled,
  100 as rollout_percentage,
  'release' as flag_type,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'marketplace');

INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, flag_type, created_at, updated_at)
SELECT 
  'analytics_dashboard' as flag_name,
  'Advanced analytics and reporting dashboard' as description,
  true as is_enabled,
  100 as rollout_percentage,
  'release' as flag_type,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'analytics_dashboard');

INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, flag_type, created_at, updated_at)
SELECT 
  'api_access' as flag_name,
  'API access for external integrations' as description,
  true as is_enabled,
  100 as rollout_percentage,
  'permission' as flag_type,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'api_access');

INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, flag_type, created_at, updated_at)
SELECT 
  'custom_branding' as flag_name,
  'Custom branding and white-label options' as description,
  true as is_enabled,
  100 as rollout_percentage,
  'release' as flag_type,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'custom_branding');

INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage, flag_type, created_at, updated_at)
SELECT 
  'multi_user' as flag_name,
  'Multiple user accounts per tenant' as description,
  true as is_enabled,
  100 as rollout_percentage,
  'release' as flag_type,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (SELECT 1 FROM feature_flags WHERE flag_name = 'multi_user');

-- Set environment_id for newly created flags
UPDATE feature_flags 
SET environment_id = (SELECT id FROM feature_environments WHERE name = 'production')
WHERE environment_id IS NULL;

-- 10. Enable RLS on new tables
ALTER TABLE feature_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_analytics ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies (super admin only for management)
CREATE POLICY "Super admins can view all environments"
  ON feature_environments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can view all evaluations"
  ON feature_flag_evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can view audit log"
  ON feature_flag_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage overrides"
  ON tenant_feature_overrides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can view analytics"
  ON feature_flag_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );