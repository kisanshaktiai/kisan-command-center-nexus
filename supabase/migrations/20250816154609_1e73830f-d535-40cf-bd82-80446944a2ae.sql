
-- Check what columns exist in onboarding_step_templates table
-- We need to create this table or fix the column references
CREATE OR REPLACE FUNCTION public.get_or_create_onboarding_workflow(p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_id uuid;
  v_template_record record;
  v_step_number integer := 1;
BEGIN
  -- Check if workflow already exists
  SELECT id INTO v_workflow_id
  FROM onboarding_workflows
  WHERE tenant_id = p_tenant_id
  AND status != 'completed'
  LIMIT 1;

  -- If workflow doesn't exist, create one
  IF v_workflow_id IS NULL THEN
    INSERT INTO onboarding_workflows (
      tenant_id,
      current_step,
      total_steps,
      status,
      started_at,
      metadata
    ) VALUES (
      p_tenant_id,
      1,
      (SELECT COUNT(*) FROM onboarding_step_templates WHERE is_active = true),
      'in_progress',
      now(),
      '{}'::jsonb
    ) RETURNING id INTO v_workflow_id;

    -- Create steps from templates
    FOR v_template_record IN 
      SELECT * FROM onboarding_step_templates 
      WHERE is_active = true 
      ORDER BY step_order ASC
    LOOP
      INSERT INTO onboarding_steps (
        workflow_id,
        step_number,
        step_name,
        step_status,
        step_data,
        validation_errors
      ) VALUES (
        v_workflow_id,
        v_step_number,
        v_template_record.step_name,
        'pending',
        COALESCE(v_template_record.default_data, '{}'::jsonb),
        '[]'::jsonb
      );
      
      v_step_number := v_step_number + 1;
    END LOOP;
  END IF;

  RETURN v_workflow_id;
END;
$$;
