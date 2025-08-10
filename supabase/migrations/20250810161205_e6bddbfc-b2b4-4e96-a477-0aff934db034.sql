
-- First, let's check what enum values are allowed for onboarding_step_status
-- and fix the advance_onboarding_step function to use the correct enum type

-- Drop the existing function
DROP FUNCTION IF EXISTS public.advance_onboarding_step(uuid, text, jsonb);

-- Recreate the function with proper enum type for step status
CREATE OR REPLACE FUNCTION public.advance_onboarding_step(
  p_step_id uuid,
  p_new_status onboarding_step_status,  -- Changed from text to enum type
  p_step_data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_step RECORD;
  v_workflow RECORD;
  v_result jsonb;
BEGIN
  -- Get step details
  SELECT * INTO v_step
  FROM onboarding_steps
  WHERE id = p_step_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Step not found'
    );
  END IF;

  -- Get workflow details
  SELECT * INTO v_workflow
  FROM onboarding_workflows
  WHERE id = v_step.workflow_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Workflow not found'
    );
  END IF;

  -- Update step status and data
  UPDATE onboarding_steps
  SET 
    step_status = p_new_status,
    step_data = COALESCE(p_step_data, step_data, '{}'::jsonb),
    completed_at = CASE WHEN p_new_status = 'completed' THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = p_step_id;

  -- Update workflow progress if step is completed
  IF p_new_status = 'completed' THEN
    UPDATE onboarding_workflows
    SET 
      current_step = current_step + 1,
      updated_at = now(),
      status = CASE 
        WHEN current_step + 1 >= total_steps THEN 'completed'
        ELSE status
      END,
      completed_at = CASE 
        WHEN current_step + 1 >= total_steps THEN now()
        ELSE completed_at
      END
    WHERE id = v_step.workflow_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'step_id', p_step_id,
    'new_status', p_new_status::text,
    'workflow_updated', true
  );
END;
$function$;

-- Also update the set_onboarding_step_data function to use proper enum casting
CREATE OR REPLACE FUNCTION public.set_onboarding_step_data(
  p_step_id uuid,
  p_step_data jsonb,
  p_new_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- If status is provided, call advance_onboarding_step with proper enum casting
  IF p_new_status IS NOT NULL THEN
    SELECT advance_onboarding_step(
      p_step_id, 
      p_new_status::onboarding_step_status,  -- Cast text to enum
      p_step_data
    ) INTO v_result;
    
    RETURN v_result;
  ELSE
    -- Just update the step data without changing status
    UPDATE onboarding_steps
    SET 
      step_data = COALESCE(p_step_data, step_data, '{}'::jsonb),
      updated_at = now()
    WHERE id = p_step_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Step not found'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'step_id', p_step_id,
      'data_updated', true
    );
  END IF;
END;
$function$;
