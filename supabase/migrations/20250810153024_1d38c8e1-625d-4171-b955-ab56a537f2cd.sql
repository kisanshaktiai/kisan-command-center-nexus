
-- Check if the function exists and create it if missing
CREATE OR REPLACE FUNCTION public.start_onboarding_workflow(
  p_tenant_id uuid,
  p_force_new boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow_id uuid;
  v_existing_workflow_id uuid;
  v_tenant_record RECORD;
  v_template jsonb;
  v_step_record jsonb;
  v_step_number integer;
  v_total_steps integer;
BEGIN
  -- Validate tenant exists
  SELECT * INTO v_tenant_record 
  FROM tenants 
  WHERE id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant not found',
      'code', 'TENANT_NOT_FOUND'
    );
  END IF;

  -- Check for existing active workflow
  SELECT id INTO v_existing_workflow_id
  FROM onboarding_workflows
  WHERE tenant_id = p_tenant_id 
    AND status NOT IN ('completed', 'cancelled')
  ORDER BY created_at DESC
  LIMIT 1;

  -- If existing workflow found and not forcing new
  IF v_existing_workflow_id IS NOT NULL AND NOT p_force_new THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Active onboarding workflow already exists',
      'code', 'WORKFLOW_EXISTS',
      'workflow_id', v_existing_workflow_id
    );
  END IF;

  -- If forcing new, mark existing as cancelled
  IF v_existing_workflow_id IS NOT NULL AND p_force_new THEN
    UPDATE onboarding_workflows 
    SET status = 'cancelled', updated_at = now()
    WHERE id = v_existing_workflow_id;
  END IF;

  -- Get onboarding template
  v_template := get_onboarding_template(
    v_tenant_record.type, 
    v_tenant_record.subscription_plan
  );
  
  v_total_steps := jsonb_array_length(v_template);

  -- Create new workflow
  INSERT INTO onboarding_workflows (
    tenant_id,
    current_step,
    total_steps,
    status,
    started_at,
    metadata
  ) VALUES (
    p_tenant_id,
    0,
    v_total_steps,
    'in_progress',
    now(),
    jsonb_build_object(
      'tenant_type', v_tenant_record.type,
      'subscription_plan', v_tenant_record.subscription_plan,
      'force_restart', p_force_new
    )
  ) RETURNING id INTO v_workflow_id;

  -- Create onboarding steps
  FOR v_step_number IN 0..jsonb_array_length(v_template) - 1 LOOP
    v_step_record := v_template -> v_step_number;
    
    INSERT INTO onboarding_steps (
      workflow_id,
      step_number,
      step_name,
      step_status,
      step_data
    ) VALUES (
      v_workflow_id,
      (v_step_record->>'step')::integer,
      v_step_record->>'name',
      CASE WHEN (v_step_record->>'step')::integer = 1 THEN 'pending' ELSE 'pending' END,
      v_step_record
    );
  END LOOP;

  -- Log the workflow creation
  PERFORM log_admin_action(
    'onboarding_workflow_started',
    NULL,
    jsonb_build_object(
      'tenant_id', p_tenant_id,
      'workflow_id', v_workflow_id,
      'force_new', p_force_new,
      'total_steps', v_total_steps
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'workflow_id', v_workflow_id,
    'message', 'Onboarding workflow started successfully',
    'total_steps', v_total_steps
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'WORKFLOW_CREATION_ERROR'
    );
END;
$$;

-- Also create the advance_onboarding_step function if it doesn't exist
CREATE OR REPLACE FUNCTION public.advance_onboarding_step(
  p_step_id uuid,
  p_new_status text,
  p_step_data jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_record RECORD;
  v_workflow_record RECORD;
  v_next_step_number integer;
  v_completed_steps integer;
BEGIN
  -- Get step details
  SELECT * INTO v_step_record
  FROM onboarding_steps
  WHERE id = p_step_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Onboarding step not found',
      'code', 'STEP_NOT_FOUND'
    );
  END IF;

  -- Get workflow details
  SELECT * INTO v_workflow_record
  FROM onboarding_workflows
  WHERE id = v_step_record.workflow_id;

  -- Validate status transition
  IF v_step_record.step_status = 'completed' AND p_new_status != 'completed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot change status of completed step',
      'code', 'INVALID_STATUS_CHANGE'
    );
  END IF;

  -- Update step
  UPDATE onboarding_steps 
  SET 
    step_status = p_new_status,
    step_data = CASE 
      WHEN p_step_data IS NOT NULL THEN p_step_data 
      ELSE step_data 
    END,
    completed_at = CASE 
      WHEN p_new_status = 'completed' THEN now() 
      ELSE completed_at 
    END,
    updated_at = now()
  WHERE id = p_step_id;

  -- Update workflow progress
  SELECT COUNT(*) INTO v_completed_steps
  FROM onboarding_steps
  WHERE workflow_id = v_step_record.workflow_id
    AND step_status = 'completed';

  -- Update workflow current step and status
  UPDATE onboarding_workflows
  SET 
    current_step = v_completed_steps,
    status = CASE 
      WHEN v_completed_steps = total_steps THEN 'completed'
      ELSE 'in_progress'
    END,
    completed_at = CASE 
      WHEN v_completed_steps = total_steps THEN now()
      ELSE completed_at
    END,
    updated_at = now()
  WHERE id = v_step_record.workflow_id;

  -- If workflow completed, update tenant status if needed
  IF v_completed_steps = v_workflow_record.total_steps THEN
    UPDATE tenants 
    SET 
      status = CASE 
        WHEN status = 'trial' THEN 'active'
        ELSE status
      END,
      updated_at = now()
    WHERE id = v_workflow_record.tenant_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'step_id', p_step_id,
    'new_status', p_new_status,
    'workflow_progress', v_completed_steps,
    'workflow_completed', v_completed_steps = v_workflow_record.total_steps
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'STEP_UPDATE_ERROR'
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.start_onboarding_workflow(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_onboarding_step(uuid, text, jsonb) TO authenticated;
