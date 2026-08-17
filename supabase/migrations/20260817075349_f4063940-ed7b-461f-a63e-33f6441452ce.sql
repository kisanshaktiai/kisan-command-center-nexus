CREATE OR REPLACE FUNCTION public.exec_governance_count(sql_text text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Forbidden: super_admin required'; END IF;
  IF sql_text !~* '^\s*select\s+count' OR sql_text ~* ';|insert\s|update\s|delete\s|drop\s|alter\s|create\s|grant\s|revoke\s|truncate\s' THEN
    RAISE EXCEPTION 'only single SELECT COUNT statements permitted';
  END IF;
  EXECUTE sql_text INTO v_count;
  RETURN v_count;
END $function$;

CREATE OR REPLACE FUNCTION public.governance_bulk_transition(p_workflow_ids uuid[], p_new_state text, p_note text DEFAULT NULL::text)
 RETURNS TABLE(rule_id text, result text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'governance'
AS $function$
DECLARE v_id uuid; v_wf public.rule_approval_workflow%ROWTYPE;
        v_rule_uuid uuid; v_text_id text;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Forbidden: super_admin required'; END IF;
  IF p_new_state NOT IN ('review','approved','published','rejected','deprecated','draft') THEN
    RAISE EXCEPTION 'Invalid state: %', p_new_state; END IF;

  FOREACH v_id IN ARRAY p_workflow_ids LOOP
    BEGIN
      -- resolve: is it a rule uuid (preferred/UI behavior) or a workflow id?
      SELECT dr.id, dr.rule_id INTO v_rule_uuid, v_text_id
        FROM public.decision_rules dr WHERE dr.id = v_id;
      IF NOT FOUND THEN
        SELECT w.rule_id INTO v_rule_uuid FROM public.rule_approval_workflow w WHERE w.id = v_id;
        IF NOT FOUND THEN
          rule_id := v_id::text; result := 'skipped — no rule or workflow with this id';
          RETURN NEXT; CONTINUE;
        END IF;
        SELECT dr.rule_id INTO v_text_id FROM public.decision_rules dr WHERE dr.id = v_rule_uuid;
      END IF;

      -- latest open workflow for the rule, else create one (system-submitted)
      SELECT * INTO v_wf FROM public.rule_approval_workflow
       WHERE rule_approval_workflow.rule_id = v_rule_uuid
         AND state NOT IN ('published','deprecated','rejected')
       ORDER BY updated_at DESC LIMIT 1;
      IF NOT FOUND THEN
        INSERT INTO public.rule_approval_workflow
          (rule_id, rule_version_id, state, submitted_by, submitted_at, agronomist_notes, metadata)
        VALUES (v_rule_uuid,
                (SELECT id FROM public.rule_versions rv WHERE rv.rule_id = v_rule_uuid ORDER BY version_number DESC LIMIT 1),
                'review', NULL, now(),
                'Auto-submitted by bulk transition (system/AI-drafted rule)',
                jsonb_build_object('origin','bulk_auto_submit'))
        RETURNING * INTO v_wf;
      END IF;

      -- walk the guarded state machine toward the target
      IF v_wf.state = 'draft' AND p_new_state IN ('review','approved') THEN
        v_wf := governance.transition_approval_state(v_wf.id, 'review', p_note);
      END IF;
      IF v_wf.state = 'review' AND p_new_state IN ('approved') THEN
        v_wf := governance.transition_approval_state(v_wf.id, 'approved', p_note);
      ELSIF v_wf.state = p_new_state THEN
        NULL; -- already there
      ELSE
        v_wf := governance.transition_approval_state(v_wf.id, p_new_state, p_note);
      END IF;

      rule_id := COALESCE(v_text_id, v_rule_uuid::text);
      result := '✓ ' || v_wf.state;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      rule_id := COALESCE(v_text_id, v_id::text);
      result := '✗ ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.governance_resolve_finding(p_finding_id uuid, p_note text DEFAULT NULL::text)
 RETURNS decision_rule_qa_findings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_row public.decision_rule_qa_findings%ROWTYPE; v_who text;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Forbidden: super_admin required'; END IF;
  v_who := COALESCE((SELECT u.email FROM auth.users u WHERE u.id = auth.uid()), auth.uid()::text);
  UPDATE public.decision_rule_qa_findings
     SET status = 'fixed', resolved_by = v_who,
         resolution_note = COALESCE(p_note, resolution_note),
         resolved_at = now()
   WHERE id = p_finding_id
   RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'finding % not found', p_finding_id; END IF;
  RETURN v_row;
END $function$;

CREATE OR REPLACE FUNCTION public.governance_submit_rule_for_review(p_rule_uuid uuid, p_note text DEFAULT NULL::text)
 RETURNS rule_approval_workflow
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'governance'
AS $function$
DECLARE v_row public.rule_approval_workflow%ROWTYPE; v_version_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Forbidden: super_admin required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.decision_rules WHERE id = p_rule_uuid) THEN
    RAISE EXCEPTION 'rule % not found', p_rule_uuid; END IF;
  IF EXISTS (SELECT 1 FROM public.rule_approval_workflow
             WHERE rule_id = p_rule_uuid AND state IN ('draft','review','approved')) THEN
    RAISE EXCEPTION 'an open workflow already exists for this rule'; END IF;
  SELECT id INTO v_version_id FROM public.rule_versions
   WHERE rule_id = p_rule_uuid ORDER BY version_number DESC LIMIT 1;
  INSERT INTO public.rule_approval_workflow
    (rule_id, rule_version_id, state, submitted_by, submitted_at, agronomist_notes)
  VALUES (p_rule_uuid, v_version_id, 'review', auth.uid(), now(), p_note)
  RETURNING * INTO v_row;
  RETURN v_row;
END $function$;

CREATE OR REPLACE FUNCTION public.governance_update_rule_fields(p_rule_id uuid, p_fields jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_applied jsonb := '{}'::jsonb; v_text_id text; v_who text;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Forbidden: super_admin required'; END IF;
  SELECT rule_id INTO v_text_id FROM public.decision_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'rule % not found', p_rule_id; END IF;
  v_who := COALESCE((SELECT u.email FROM auth.users u WHERE u.id = auth.uid()), auth.uid()::text);

  IF p_fields ? 'active_ingredient' THEN
    UPDATE public.decision_rules SET active_ingredient = NULLIF(btrim(p_fields->>'active_ingredient'),'') WHERE id = p_rule_id;
    v_applied := v_applied || jsonb_build_object('active_ingredient', p_fields->>'active_ingredient'); END IF;
  IF p_fields ? 'dosage_per_acre' THEN
    UPDATE public.decision_rules SET dosage_per_acre = NULLIF(btrim(p_fields->>'dosage_per_acre'),'') WHERE id = p_rule_id;
    v_applied := v_applied || jsonb_build_object('dosage_per_acre', p_fields->>'dosage_per_acre'); END IF;
  IF p_fields ? 'water_volume_per_acre' THEN
    UPDATE public.decision_rules SET water_volume_per_acre = NULLIF(btrim(p_fields->>'water_volume_per_acre'),'') WHERE id = p_rule_id;
    v_applied := v_applied || jsonb_build_object('water_volume_per_acre', p_fields->>'water_volume_per_acre'); END IF;
  IF p_fields ? 'phi_days' THEN
    UPDATE public.decision_rules SET phi_days = NULLIF(p_fields->>'phi_days','')::int,
      phi_status = CASE WHEN NULLIF(p_fields->>'phi_days','') IS NOT NULL
                        THEN COALESCE(NULLIF(p_fields->>'phi_status',''),'PHI_REQUIRED_UNVERIFIED')
                        ELSE phi_status END,
      phi_source = CASE WHEN NULLIF(p_fields->>'phi_days','') IS NOT NULL
                        THEN 'Set via portal by '||v_who||' on '||now()::date ELSE phi_source END
    WHERE id = p_rule_id;
    v_applied := v_applied || jsonb_build_object('phi_days', p_fields->>'phi_days'); END IF;
  IF p_fields ? 'phi_status' AND NOT (p_fields ? 'phi_days') THEN
    UPDATE public.decision_rules SET phi_status = NULLIF(p_fields->>'phi_status','') WHERE id = p_rule_id;
    v_applied := v_applied || jsonb_build_object('phi_status', p_fields->>'phi_status'); END IF;
  IF p_fields ? 'application_method' THEN
    UPDATE public.decision_rules SET application_method = NULLIF(btrim(p_fields->>'application_method'),'') WHERE id = p_rule_id;
    v_applied := v_applied || jsonb_build_object('application_method', p_fields->>'application_method'); END IF;
  IF p_fields ? 'bee_toxicity' THEN
    UPDATE public.decision_rules SET bee_toxicity = NULLIF(btrim(p_fields->>'bee_toxicity'),'') WHERE id = p_rule_id;
    v_applied := v_applied || jsonb_build_object('bee_toxicity', p_fields->>'bee_toxicity'); END IF;
  IF p_fields ? 'regulatory_status' THEN
    UPDATE public.decision_rules SET regulatory_status = NULLIF(btrim(p_fields->>'regulatory_status'),'') WHERE id = p_rule_id;
    v_applied := v_applied || jsonb_build_object('regulatory_status', p_fields->>'regulatory_status'); END IF;
  IF p_fields ? 'confidence_score' THEN
    UPDATE public.decision_rules SET confidence_score = NULLIF(p_fields->>'confidence_score','')::numeric WHERE id = p_rule_id;
    v_applied := v_applied || jsonb_build_object('confidence_score', p_fields->>'confidence_score'); END IF;

  IF v_applied = '{}'::jsonb THEN RAISE EXCEPTION 'no whitelisted fields in payload'; END IF;

  INSERT INTO public.decision_rule_qa_findings
    (rule_id, finding_type, detail, status, resolved_by, resolution_note, resolved_at)
  VALUES (v_text_id, 'FIELD_EDIT_PORTAL',
          'Gate fields edited via review portal: '||v_applied::text,
          'accepted_as_is', v_who, 'Portal edit; snapshot captured by trigger.', now());
  RETURN v_applied;
END $function$;

REVOKE ALL ON FUNCTION public.exec_governance_count(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.governance_bulk_transition(uuid[], text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.governance_resolve_finding(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.governance_submit_rule_for_review(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.governance_update_rule_fields(uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.exec_governance_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.governance_bulk_transition(uuid[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.governance_resolve_finding(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.governance_submit_rule_for_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.governance_update_rule_fields(uuid, jsonb) TO authenticated;