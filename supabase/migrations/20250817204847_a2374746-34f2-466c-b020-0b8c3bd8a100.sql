
-- Create RPC function to remove onboarding workflow and all associated steps
CREATE OR REPLACE FUNCTION public.remove_onboarding_workflow(p_workflow_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tenant_id uuid;
  v_steps_count integer;
  v_workflow_exists boolean;
BEGIN
  -- Check if workflow exists and get tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM public.onboarding_workflows
  WHERE id = p_workflow_id;
  
  v_workflow_exists := FOUND;
  
  IF NOT v_workflow_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Workflow not found',
      'code', 'WORKFLOW_NOT_FOUND'
    );
  END IF;

  -- Count associated steps before deletion for logging
  SELECT COUNT(*) INTO v_steps_count
  FROM public.onboarding_steps
  WHERE workflow_id = p_workflow_id;

  -- Delete all associated steps first
  DELETE FROM public.onboarding_steps
  WHERE workflow_id = p_workflow_id;

  -- Delete the workflow
  DELETE FROM public.onboarding_workflows
  WHERE id = p_workflow_id;

  -- Log the removal action for audit trail
  PERFORM public.log_admin_action(
    'onboarding_workflow_removed',
    NULL,
    jsonb_build_object(
      'workflow_id', p_workflow_id,
      'tenant_id', v_tenant_id,
      'steps_removed', v_steps_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Workflow removed successfully',
    'workflow_id', p_workflow_id,
    'steps_removed', v_steps_count
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error for debugging
    PERFORM public.log_admin_action(
      'onboarding_workflow_removal_error',
      NULL,
      jsonb_build_object(
        'workflow_id', p_workflow_id,
        'error_message', SQLERRM,
        'error_state', SQLSTATE
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to remove workflow: ' || SQLERRM,
      'code', 'DATABASE_ERROR'
    );
END;
$function$;
