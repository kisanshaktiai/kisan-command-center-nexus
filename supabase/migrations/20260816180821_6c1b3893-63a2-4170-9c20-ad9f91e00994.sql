CREATE OR REPLACE FUNCTION governance.simulate_rule(p_rule_id uuid, p_sample_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'governance'
AS $function$
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
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin required';
  END IF;

  SELECT * INTO v_rule FROM public.decision_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false, 'error', 'rule_not_found');
  END IF;

  v_input_crop := NULLIF(trim(p_sample_input->>'crop_code'), '');
  v_input_stage := NULLIF(trim(p_sample_input->>'stage'), '');
  v_input_observation := p_sample_input->>'observation';
  v_input_plant_part := p_sample_input->>'plant_part';

  -- crop_code: NULL or 'all'/'any'/'*' on the rule means global
  IF v_rule.crop_code IS NOT NULL AND lower(v_rule.crop_code) NOT IN ('all','any','*') THEN
    IF v_input_crop IS NULL OR lower(v_rule.crop_code) <> lower(v_input_crop) THEN
      v_matched := false;
      v_reasons := v_reasons || jsonb_build_object(
        'field','crop_code','expected', v_rule.crop_code, 'actual', v_input_crop);
    END IF;
  END IF;

  -- stage_applicable is text[]; empty/NULL or containing 'all' means any stage
  IF v_rule.stage_applicable IS NOT NULL
     AND array_length(v_rule.stage_applicable, 1) > 0
     AND NOT EXISTS (
       SELECT 1 FROM unnest(v_rule.stage_applicable) s
       WHERE lower(s) IN ('all','any','*')
     )
  THEN
    IF v_input_stage IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(v_rule.stage_applicable) s
      WHERE lower(s) = lower(v_input_stage)
    ) THEN
      v_matched := false;
      v_reasons := v_reasons || jsonb_build_object(
        'field','stage_applicable',
        'expected', to_jsonb(v_rule.stage_applicable),
        'actual', v_input_stage);
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
$function$;