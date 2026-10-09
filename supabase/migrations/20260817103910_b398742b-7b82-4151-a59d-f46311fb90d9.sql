CREATE OR REPLACE FUNCTION public.governance_submit_rule_for_review(p_rule_uuid uuid, p_note text DEFAULT NULL::text)
 RETURNS rule_approval_workflow
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'governance'
AS $function$
DECLARE v_row public.rule_approval_workflow%ROWTYPE; v_version_id uuid; v_text_id text;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Forbidden: super_admin required'; END IF;
  SELECT rule_id INTO v_text_id FROM public.decision_rules WHERE id = p_rule_uuid;
  IF v_text_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.decision_rules WHERE id = p_rule_uuid) THEN
    RAISE EXCEPTION 'rule % not found', p_rule_uuid; END IF;
  IF EXISTS (SELECT 1 FROM public.rule_approval_workflow
             WHERE rule_id = p_rule_uuid AND state IN ('draft','review','approved')) THEN
    RAISE EXCEPTION 'an open workflow already exists for this rule'; END IF;
  -- rule_versions.rule_id is TEXT (the rule code), not the uuid
  SELECT id INTO v_version_id FROM public.rule_versions
   WHERE rule_id = v_text_id ORDER BY version_number DESC LIMIT 1;
  INSERT INTO public.rule_approval_workflow
    (rule_id, rule_version_id, state, submitted_by, submitted_at, agronomist_notes)
  VALUES (p_rule_uuid, v_version_id, 'review', auth.uid(), now(), p_note)
  RETURNING * INTO v_row;
  RETURN v_row;
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
      v_rule_uuid := NULL; v_text_id := NULL;
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

      SELECT * INTO v_wf FROM public.rule_approval_workflow
       WHERE rule_approval_workflow.rule_id = v_rule_uuid
         AND state NOT IN ('published','deprecated','rejected')
       ORDER BY updated_at DESC LIMIT 1;
      IF NOT FOUND THEN
        INSERT INTO public.rule_approval_workflow
          (rule_id, rule_version_id, state, submitted_by, submitted_at, agronomist_notes, metadata)
        VALUES (v_rule_uuid,
                (SELECT id FROM public.rule_versions rv WHERE rv.rule_id = v_text_id ORDER BY version_number DESC LIMIT 1),
                'review', NULL, now(),
                'Auto-submitted by bulk transition (system/AI-drafted rule)',
                jsonb_build_object('origin','bulk_auto_submit'))
        RETURNING * INTO v_wf;
      END IF;

      IF v_wf.state = 'draft' AND p_new_state IN ('review','approved') THEN
        v_wf := governance.transition_approval_state(v_wf.id, 'review', p_note);
      END IF;
      IF v_wf.state = 'review' AND p_new_state IN ('approved') THEN
        v_wf := governance.transition_approval_state(v_wf.id, 'approved', p_note);
      ELSIF v_wf.state = p_new_state THEN
        NULL;
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

CREATE OR REPLACE FUNCTION governance.rollback_rule_to_version(p_version_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS rule_approval_workflow
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'governance'
AS $function$
DECLARE
  v_version public.rule_versions%ROWTYPE;
  v_workflow public.rule_approval_workflow%ROWTYPE;
  v_rule_uuid uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin required';
  END IF;

  SELECT * INTO v_version FROM public.rule_versions WHERE id = p_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- rule_versions.rule_id is the TEXT rule code; workflow needs the uuid
  SELECT dr.id INTO v_rule_uuid FROM public.decision_rules dr WHERE dr.rule_id = v_version.rule_id;
  IF v_rule_uuid IS NULL THEN
    RAISE EXCEPTION 'No decision rule found for version % (rule_id %)', p_version_id, v_version.rule_id;
  END IF;

  INSERT INTO public.rule_approval_workflow (
    rule_id, rule_version_id, state, reviewer_id, agronomist_notes, proposed_payload
  ) VALUES (
    v_rule_uuid,
    p_version_id,
    'draft',
    auth.uid(),
    COALESCE(p_notes, 'Rollback to version ' || p_version_id::text),
    v_version.snapshot
  )
  RETURNING * INTO v_workflow;

  RETURN v_workflow;
END;
$function$;

REVOKE ALL ON FUNCTION public.governance_submit_rule_for_review(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.governance_bulk_transition(uuid[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.governance_submit_rule_for_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.governance_bulk_transition(uuid[], text, text) TO authenticated;