
-- Ensure governance schema exists
CREATE SCHEMA IF NOT EXISTS governance;

-- ============================================================
-- 1. simulate_rule: dry-run a rule against sample input
-- ============================================================
CREATE OR REPLACE FUNCTION governance.simulate_rule(
  p_rule_id uuid,
  p_sample_input jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, governance
AS $$
DECLARE
  v_rule public.decision_rules%ROWTYPE;
  v_conditions jsonb;
  v_matched boolean := true;
  v_reasons jsonb := '[]'::jsonb;
  v_input_crop text;
  v_input_stage text;
  v_input_observation text;
  v_input_plant_part text;
BEGIN
  -- super-admin gate
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin required';
  END IF;

  SELECT * INTO v_rule FROM public.decision_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false, 'error', 'rule_not_found');
  END IF;

  v_input_crop := p_sample_input->>'crop_code';
  v_input_stage := p_sample_input->>'stage';
  v_input_observation := p_sample_input->>'observation';
  v_input_plant_part := p_sample_input->>'plant_part';

  -- Compare core fields if rule has them
  IF to_jsonb(v_rule) ? 'crop_code' AND (to_jsonb(v_rule)->>'crop_code') IS NOT NULL THEN
    IF (to_jsonb(v_rule)->>'crop_code') <> COALESCE(v_input_crop,'') THEN
      v_matched := false;
      v_reasons := v_reasons || jsonb_build_object('field','crop_code','expected', to_jsonb(v_rule)->>'crop_code','actual', v_input_crop);
    END IF;
  END IF;

  IF to_jsonb(v_rule) ? 'stage' AND (to_jsonb(v_rule)->>'stage') IS NOT NULL THEN
    IF (to_jsonb(v_rule)->>'stage') <> COALESCE(v_input_stage,'') THEN
      v_matched := false;
      v_reasons := v_reasons || jsonb_build_object('field','stage','expected', to_jsonb(v_rule)->>'stage','actual', v_input_stage);
    END IF;
  END IF;

  v_conditions := COALESCE(to_jsonb(v_rule)->'conditions_json', '{}'::jsonb);

  RETURN jsonb_build_object(
    'matched', v_matched,
    'rule_id', p_rule_id,
    'sample_input', p_sample_input,
    'conditions_json', v_conditions,
    'mismatch_reasons', v_reasons,
    'simulated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION governance.simulate_rule(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION governance.simulate_rule(uuid, jsonb) TO authenticated;

-- ============================================================
-- 2. transition_approval_state
-- ============================================================
CREATE OR REPLACE FUNCTION governance.transition_approval_state(
  p_workflow_id uuid,
  p_new_state text,
  p_notes text DEFAULT NULL
)
RETURNS public.rule_approval_workflow
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, governance
AS $$
DECLARE
  v_row public.rule_approval_workflow%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin required';
  END IF;

  IF p_new_state NOT IN ('draft','review','approved','published','deprecated','rejected') THEN
    RAISE EXCEPTION 'Invalid state: %', p_new_state;
  END IF;

  UPDATE public.rule_approval_workflow
     SET state = p_new_state,
         reviewer_id = auth.uid(),
         agronomist_notes = COALESCE(p_notes, agronomist_notes),
         updated_at = now()
   WHERE id = p_workflow_id
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow row not found';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION governance.transition_approval_state(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION governance.transition_approval_state(uuid, text, text) TO authenticated;

-- ============================================================
-- 3. rollback_rule_to_version: stage rollback as a draft
-- ============================================================
CREATE OR REPLACE FUNCTION governance.rollback_rule_to_version(
  p_version_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS public.rule_approval_workflow
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, governance
AS $$
DECLARE
  v_version public.rule_versions%ROWTYPE;
  v_workflow public.rule_approval_workflow%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin required';
  END IF;

  SELECT * INTO v_version FROM public.rule_versions WHERE id = p_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  INSERT INTO public.rule_approval_workflow (
    rule_id,
    state,
    reviewer_id,
    agronomist_notes,
    proposed_payload
  ) VALUES (
    v_version.rule_id,
    'draft',
    auth.uid(),
    COALESCE(p_notes, 'Rollback to version ' || p_version_id::text),
    v_version.snapshot
  )
  RETURNING * INTO v_workflow;

  RETURN v_workflow;
END;
$$;

REVOKE ALL ON FUNCTION governance.rollback_rule_to_version(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION governance.rollback_rule_to_version(uuid, text) TO authenticated;

-- ============================================================
-- 4. Ensure rule_approval_workflow has columns we reference
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rule_approval_workflow' AND column_name='proposed_payload'
  ) THEN
    ALTER TABLE public.rule_approval_workflow ADD COLUMN proposed_payload jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rule_approval_workflow' AND column_name='updated_at'
  ) THEN
    ALTER TABLE public.rule_approval_workflow ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;
