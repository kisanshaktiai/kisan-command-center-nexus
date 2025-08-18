-- 20250818_backfill_user_tenants.sql
-- Purpose: Ensure tenant <-> user <-> user_tenants consistency
-- Fixes "ghost tenants" where user_tenants is missing

BEGIN;

-- 1. Ensure foreign key constraints (idempotent)
ALTER TABLE user_tenants
  ADD CONSTRAINT IF NOT EXISTS fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Ensure uniqueness constraint
ALTER TABLE user_tenants
  ADD CONSTRAINT IF NOT EXISTS user_tenants_unique UNIQUE (user_id, tenant_id);

-- 3. Backfill missing relationships:
-- Case A: Tenant owners (tenants.owner_id must be in user_tenants)
INSERT INTO user_tenants (user_id, tenant_id, role)
SELECT u.id AS user_id, t.id AS tenant_id, 'owner' AS role
FROM auth.users u
JOIN tenants t ON t.owner_id = u.id
LEFT JOIN user_tenants ut ON ut.user_id = u.id AND ut.tenant_id = t.id
WHERE ut.user_id IS NULL;

-- Case B: Invited users (if a tenant_users staging table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_users') THEN
    INSERT INTO user_tenants (user_id, tenant_id, role)
    SELECT u.id, tu.tenant_id, COALESCE(tu.role, 'member')
    FROM auth.users u
    JOIN tenant_users tu ON tu.user_email = u.email
    LEFT JOIN user_tenants ut ON ut.user_id = u.id AND ut.tenant_id = tu.tenant_id
    WHERE ut.user_id IS NULL;
  END IF;
END $$;

-- 4. RLS Policy Reinforcement
CREATE POLICY IF NOT EXISTS user_tenant_select_policy
ON user_tenants
FOR SELECT
USING (auth.uid() = user_id);

COMMIT;

-- ✅ After migration, every tenant must have at least:
--    - One owner (from tenants.owner_id)
--    - Valid mappings for invited users
-- Dashboard queries should ONLY use user_tenants
