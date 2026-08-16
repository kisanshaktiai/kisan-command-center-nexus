CREATE OR REPLACE FUNCTION governance.transition_approval_state(p_workflow_id uuid, p_new_state text, p_notes text DEFAULT NULL::text)
 RETURNS public.rule_approval_workflow
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'governance'
AS $function$
DECLARE
  v_row public.rule_approval_workflow%ROWTYPE;
  v_current_state text;
  v_rule_id uuid;
  v_submitter uuid;
  v_allowed text[];
  v_reviewer text;
  v_r public.decision_rules%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin required';
  END IF;

  IF p_new_state NOT IN ('draft','review','approved','published','deprecated','rejected') THEN
    RAISE EXCEPTION 'Invalid state: %', p_new_state;
  END IF;

  SELECT state, rule_id, submitted_by
    INTO v_current_state, v_rule_id, v_submitter
    FROM public.rule_approval_workflow
   WHERE id = p_workflow_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow row not found';
  END IF;

  v_allowed := CASE v_current_state
    WHEN 'draft'      THEN ARRAY['review','rejected']
    WHEN 'review'     THEN ARRAY['approved','rejected','draft']
    WHEN 'approved'   THEN ARRAY['published','deprecated']
    WHEN 'published'  THEN ARRAY['deprecated']
    WHEN 'rejected'   THEN ARRAY['draft']
    WHEN 'deprecated' THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_new_state = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'invalid transition: % -> % is not permitted', COALESCE(v_current_state,'(null)'), p_new_state;
  END IF;

  IF v_current_state = 'review' AND p_new_state = 'approved' THEN
    IF v_submitter IS NOT NULL AND v_submitter = auth.uid() THEN
      RAISE EXCEPTION 'maker-checker: submitter cannot approve own rule';
    END IF;
  END IF;

  IF v_current_state = 'approved' AND p_new_state = 'published' THEN
    IF v_rule_id IS NULL THEN
      RAISE EXCEPTION 'safety gate: workflow has no linked rule_id';
    END IF;

    SELECT * INTO v_r FROM public.decision_rules WHERE id = v_rule_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'safety gate: linked decision_rules row % not found', v_rule_id;
    END IF;

    IF COALESCE(v_r.regulatory_status,'') IN ('restricted','banned') THEN
      RAISE EXCEPTION 'safety gate: regulatory status %', v_r.regulatory_status;
    END IF;

    IF v_r.active_ingredient IS NOT NULL AND btrim(v_r.active_ingredient) <> ''
       AND (v_r.dosage_per_acre IS NULL OR btrim(v_r.dosage_per_acre) = '') THEN
      RAISE EXCEPTION 'safety gate: chemical rule without structured dosage';
    END IF;

    IF v_r.active_ingredient IS NOT NULL AND btrim(v_r.active_ingredient) <> ''
       AND v_r.category IN ('disease','pest','weed','proactive_pest')
       AND v_r.phi_days IS NULL THEN
      RAISE EXCEPTION 'safety gate: chemical rule without PHI';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.decision_rule_qa_findings f
       WHERE f.rule_id = v_r.rule_id
         AND f.status IN ('open','needs_expert_review')
         AND f.finding_type IN ('FIELD_MISMATCH_SUSPECTED_SHIFT',
              'FIELD_MISMATCH_ACTIVE_INGREDIENT','DUPLICATE_RULE_PAIR',
              'UNGATED_CHEMICAL_RULE','BANNED_SUBSTANCE_REMOVED',
              'DOSE_LABEL_MISMATCH','CLAIM_OVERREACH')
    ) THEN
      RAISE EXCEPTION 'safety gate: open blocking QA finding — resolve it first';
    END IF;

    v_reviewer := COALESCE((SELECT u.email FROM auth.users u WHERE u.id = auth.uid()), auth.uid()::text);

    UPDATE public.decision_rules
       SET expert_approved = true,
           approved_by = v_reviewer,
           approval_date = now(),
           verification_status = 'VERIFIED'
     WHERE id = v_rule_id;
  END IF;

  UPDATE public.rule_approval_workflow
     SET state = p_new_state,
         reviewer_id = auth.uid(),
         agronomist_notes = COALESCE(p_notes, agronomist_notes),
         updated_at = now()
   WHERE id = p_workflow_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION governance.transition_approval_state(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION governance.transition_approval_state(uuid, text, text) TO authenticated;