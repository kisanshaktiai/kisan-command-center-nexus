
-- =========================================================
-- M2: Governance Schema (additive, non-breaking)
-- =========================================================

-- ---------------------------------------------------------
-- 1. rule_versions (immutable snapshots of decision_rules)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('insert','update','manual')),
  changed_by UUID,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rule_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_rule_versions_rule_id ON public.rule_versions (rule_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_rule_versions_created_at ON public.rule_versions (created_at DESC);

ALTER TABLE public.rule_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_select_rule_versions" ON public.rule_versions FOR SELECT USING (is_super_admin());
CREATE POLICY "super_admin_insert_rule_versions" ON public.rule_versions FOR INSERT WITH CHECK (is_super_admin());

-- ---------------------------------------------------------
-- 2. hypothesis_versions
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hypothesis_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('insert','update','manual')),
  changed_by UUID,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hypothesis_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_hypothesis_versions_hyp_id ON public.hypothesis_versions (hypothesis_id, version_number DESC);

ALTER TABLE public.hypothesis_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_select_hyp_versions" ON public.hypothesis_versions FOR SELECT USING (is_super_admin());
CREATE POLICY "super_admin_insert_hyp_versions" ON public.hypothesis_versions FOR INSERT WITH CHECK (is_super_admin());

-- ---------------------------------------------------------
-- 3. observation_versions
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.observation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('insert','update','manual')),
  changed_by UUID,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (observation_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_obs_versions_obs_id ON public.observation_versions (observation_id, version_number DESC);

ALTER TABLE public.observation_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_select_obs_versions" ON public.observation_versions FOR SELECT USING (is_super_admin());
CREATE POLICY "super_admin_insert_obs_versions" ON public.observation_versions FOR INSERT WITH CHECK (is_super_admin());

-- ---------------------------------------------------------
-- 4. Immutability trigger function (block UPDATE/DELETE on *_versions)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.governance_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Versions tables are append-only (operation: %)', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS rule_versions_immutable ON public.rule_versions;
CREATE TRIGGER rule_versions_immutable
  BEFORE UPDATE OR DELETE ON public.rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.governance_block_mutation();

DROP TRIGGER IF EXISTS hypothesis_versions_immutable ON public.hypothesis_versions;
CREATE TRIGGER hypothesis_versions_immutable
  BEFORE UPDATE OR DELETE ON public.hypothesis_versions
  FOR EACH ROW EXECUTE FUNCTION public.governance_block_mutation();

DROP TRIGGER IF EXISTS observation_versions_immutable ON public.observation_versions;
CREATE TRIGGER observation_versions_immutable
  BEFORE UPDATE OR DELETE ON public.observation_versions
  FOR EACH ROW EXECUTE FUNCTION public.governance_block_mutation();

-- ---------------------------------------------------------
-- 5. Snapshot trigger functions for source tables
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_decision_rule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.rule_versions
    WHERE rule_id = NEW.id;

  INSERT INTO public.rule_versions (rule_id, version_number, snapshot, change_type, changed_by)
  VALUES (
    NEW.id,
    v_next_version,
    to_jsonb(NEW),
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_hypothesis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.hypothesis_versions
    WHERE hypothesis_id = NEW.id;

  INSERT INTO public.hypothesis_versions (hypothesis_id, version_number, snapshot, change_type, changed_by)
  VALUES (
    NEW.id,
    v_next_version,
    to_jsonb(NEW),
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_observation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.observation_versions
    WHERE observation_id = NEW.id;

  INSERT INTO public.observation_versions (observation_id, version_number, snapshot, change_type, changed_by)
  VALUES (
    NEW.id,
    v_next_version,
    to_jsonb(NEW),
    CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END,
    auth.uid()
  );
  RETURN NEW;
END;
$$;

-- Attach triggers (only if source tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='decision_rules') THEN
    DROP TRIGGER IF EXISTS trg_snapshot_decision_rule ON public.decision_rules;
    CREATE TRIGGER trg_snapshot_decision_rule
      AFTER INSERT OR UPDATE ON public.decision_rules
      FOR EACH ROW EXECUTE FUNCTION public.snapshot_decision_rule();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hypothesis_master') THEN
    DROP TRIGGER IF EXISTS trg_snapshot_hypothesis ON public.hypothesis_master;
    CREATE TRIGGER trg_snapshot_hypothesis
      AFTER INSERT OR UPDATE ON public.hypothesis_master
      FOR EACH ROW EXECUTE FUNCTION public.snapshot_hypothesis();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='observation_master') THEN
    DROP TRIGGER IF EXISTS trg_snapshot_observation ON public.observation_master;
    CREATE TRIGGER trg_snapshot_observation
      AFTER INSERT OR UPDATE ON public.observation_master
      FOR EACH ROW EXECUTE FUNCTION public.snapshot_observation();
  END IF;
END $$;

-- ---------------------------------------------------------
-- 6. rule_approval_workflow
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_approval_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL,
  rule_version_id UUID REFERENCES public.rule_versions(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','review','approved','published','deprecated','rejected')),
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,
  agronomist_notes TEXT,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_rule_id ON public.rule_approval_workflow (rule_id);
CREATE INDEX IF NOT EXISTS idx_workflow_state ON public.rule_approval_workflow (state, updated_at DESC);

ALTER TABLE public.rule_approval_workflow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_workflow" ON public.rule_approval_workflow FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE OR REPLACE FUNCTION public.governance_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_updated_at ON public.rule_approval_workflow;
CREATE TRIGGER trg_workflow_updated_at
  BEFORE UPDATE ON public.rule_approval_workflow
  FOR EACH ROW EXECUTE FUNCTION public.governance_touch_updated_at();

-- ---------------------------------------------------------
-- 7. rule_conflict_matrix
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_conflict_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_a_id UUID NOT NULL,
  rule_b_id UUID NOT NULL,
  conflict_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','critical')),
  conflict_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  CHECK (rule_a_id <> rule_b_id),
  UNIQUE (rule_a_id, rule_b_id, conflict_type)
);
CREATE INDEX IF NOT EXISTS idx_conflict_rule_a ON public.rule_conflict_matrix (rule_a_id);
CREATE INDEX IF NOT EXISTS idx_conflict_rule_b ON public.rule_conflict_matrix (rule_b_id);
CREATE INDEX IF NOT EXISTS idx_conflict_unresolved ON public.rule_conflict_matrix (resolved, severity) WHERE resolved = false;

ALTER TABLE public.rule_conflict_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_conflicts" ON public.rule_conflict_matrix FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ---------------------------------------------------------
-- 8. rule_explainability
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_explainability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL,
  execution_id UUID,
  fired BOOLEAN NOT NULL,
  why_fired JSONB,
  why_not_fired JSONB,
  evidence_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_breakdown JSONB DEFAULT '{}'::jsonb,
  input_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_explain_rule_id ON public.rule_explainability (rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_explain_fired ON public.rule_explainability (fired, created_at DESC);

ALTER TABLE public.rule_explainability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_explain" ON public.rule_explainability FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ---------------------------------------------------------
-- 9. rule_lineage (parent → child evolution graph)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rule_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_rule_id UUID NOT NULL,
  child_rule_id UUID NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'derived' CHECK (relation_type IN ('derived','split','merged','superseded','clone','refined')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (parent_rule_id <> child_rule_id),
  UNIQUE (parent_rule_id, child_rule_id, relation_type)
);
CREATE INDEX IF NOT EXISTS idx_lineage_parent ON public.rule_lineage (parent_rule_id);
CREATE INDEX IF NOT EXISTS idx_lineage_child ON public.rule_lineage (child_rule_id);

ALTER TABLE public.rule_lineage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_all_lineage" ON public.rule_lineage FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
