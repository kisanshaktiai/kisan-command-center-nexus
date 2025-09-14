
-- Create the advance_onboarding_step RPC function
CREATE OR REPLACE FUNCTION public.advance_onboarding_step(
  p_step_id uuid,
  p_new_status text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_record RECORD;
  v_step_record RECORD;
  v_next_step_record RECORD;
  v_total_completed INTEGER;
  v_result jsonb;
BEGIN
  -- Get the step and workflow details
  SELECT os.*, ow.id as workflow_id, ow.tenant_id, ow.total_steps
  INTO v_step_record
  FROM onboarding_steps os
  JOIN onboarding_workflows ow ON os.workflow_id = ow.id
  WHERE os.id = p_step_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Step not found');
  END IF;
  
  -- Validate status transition
  IF v_step_record.step_status = 'completed' AND p_new_status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Step already completed');
  END IF;
  
  -- Update the current step
  UPDATE onboarding_steps 
  SET 
    step_status = p_new_status,
    completed_at = CASE WHEN p_new_status = 'completed' THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = p_step_id;
  
  -- If step is completed, advance to next step
  IF p_new_status = 'completed' THEN
    -- Find and activate the next pending step
    SELECT * INTO v_next_step_record
    FROM onboarding_steps
    WHERE workflow_id = v_step_record.workflow_id
      AND step_number = v_step_record.step_number + 1
      AND step_status = 'pending';
      
    IF FOUND THEN
      UPDATE onboarding_steps
      SET step_status = 'in_progress', updated_at = now()
      WHERE id = v_next_step_record.id;
    END IF;
    
    -- Count total completed steps
    SELECT COUNT(*) INTO v_total_completed
    FROM onboarding_steps
    WHERE workflow_id = v_step_record.workflow_id
      AND step_status = 'completed';
    
    -- Update workflow progress
    UPDATE onboarding_workflows
    SET 
      current_step = v_step_record.step_number + 1,
      status = CASE 
        WHEN v_total_completed >= v_step_record.total_steps THEN 'completed'
        ELSE 'in_progress'
      END,
      completed_at = CASE 
        WHEN v_total_completed >= v_step_record.total_steps THEN now()
        ELSE completed_at
      END,
      updated_at = now()
    WHERE id = v_step_record.workflow_id;
  END IF;
  
  -- If step is started, update workflow current step
  IF p_new_status = 'in_progress' THEN
    UPDATE onboarding_workflows
    SET 
      current_step = v_step_record.step_number,
      status = 'in_progress',
      updated_at = now()
    WHERE id = v_step_record.workflow_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'step_id', p_step_id,
    'new_status', p_new_status,
    'workflow_id', v_step_record.workflow_id
  );
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_workflow_id ON onboarding_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_tenant_id ON onboarding_workflows(tenant_id);

-- Create a function to get available tenants (those without workflows)
CREATE OR REPLACE FUNCTION public.get_available_tenants_for_onboarding()
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name
  FROM tenants t
  WHERE t.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM onboarding_workflows ow 
      WHERE ow.tenant_id = t.id
    )
  ORDER BY t.created_at DESC;
END;
$$;
