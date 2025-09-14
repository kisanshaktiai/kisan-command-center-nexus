
-- Drop the ambiguous two-parameter version of advance_onboarding_step
-- This will leave only the three-parameter version which should resolve the overload conflict
DROP FUNCTION IF EXISTS public.advance_onboarding_step(p_step_id uuid, p_new_status text);

-- Ensure we have the correct three-parameter version
CREATE OR REPLACE FUNCTION public.advance_onboarding_step(
  p_step_id uuid,
  p_new_status text,
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
    'new_status', p_new_status
  );
END;
$function$;
