
-- 1) Allow super admins to fully manage onboarding tables (in addition to existing tenant RLS)
CREATE POLICY IF NOT EXISTS "Super admins manage all onboarding workflows"
  ON public.onboarding_workflows
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY IF NOT EXISTS "Super admins manage all onboarding steps"
  ON public.onboarding_steps
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 2) Idempotent workflow start for a tenant using the plan-based template
CREATE OR REPLACE FUNCTION public.start_onboarding_workflow(
  p_tenant_id uuid,
  p_force_new boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant RECORD;
  v_existing_workflow_id uuid;
  v_new_workflow_id uuid;
  v_template jsonb;
  v_total_steps integer := 0;
BEGIN
  -- Access control: tenant users or super admin
  IF NOT (public.user_has_tenant_access(p_tenant_id) OR public.is_super_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Ensure tenant exists
  SELECT id, type::text AS tenant_type, subscription_plan::text AS subscription_plan
  INTO v_tenant
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant not found');
  END IF;

  -- Return existing in-progress workflow unless forcing a new one
  SELECT id INTO v_existing_workflow_id
  FROM public.onboarding_workflows
  WHERE tenant_id = p_tenant_id
    AND status <> 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_workflow_id IS NOT NULL AND NOT p_force_new THEN
    RETURN jsonb_build_object(
      'success', true,
      'workflow_id', v_existing_workflow_id,
      'reused', true
    );
  END IF;

  -- Get plan-based onboarding template
  v_template := public.get_onboarding_template(v_tenant.tenant_type, v_tenant.subscription_plan);
  v_total_steps := COALESCE(jsonb_array_length(v_template), 0);
  IF v_total_steps = 0 THEN
    -- Fallback to 1 minimal step if template is empty
    v_template := jsonb_build_array(jsonb_build_object('step', 1, 'name', 'Getting Started', 'required', true));
    v_total_steps := 1;
  END IF;

  -- Create workflow
  INSERT INTO public.onboarding_workflows (tenant_id, current_step, total_steps, status, started_at, metadata)
  VALUES (p_tenant_id, 1, v_total_steps, 'in_progress', now(),
          jsonb_build_object('template_source', 'plan', 'tenant_type', v_tenant.tenant_type, 'subscription_plan', v_tenant.subscription_plan))
  RETURNING id INTO v_new_workflow_id;

  -- Create steps from template (first step starts in_progress)
  INSERT INTO public.onboarding_steps (workflow_id, step_number, step_name, step_status, step_data)
  SELECT
    v_new_workflow_id,
    COALESCE((elem->>'step')::int, ord::int) AS step_number,
    COALESCE(elem->>'name', 'Step ' || ord::text) AS step_name,
    CASE WHEN ord = 1 THEN 'in_progress'::onboarding_step_status ELSE 'pending'::onboarding_step_status END AS step_status,
    elem AS step_data
  FROM jsonb_array_elements(v_template) WITH ORDINALITY AS t(elem, ord);

  RETURN jsonb_build_object(
    'success', true,
    'workflow_id', v_new_workflow_id,
    'reused', false,
    'total_steps', v_total_steps
  );
END;
$$;

-- 3) Unified status fetch for a tenant (current workflow + steps + progress)
CREATE OR REPLACE FUNCTION public.get_onboarding_status(
  p_tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workflow RECORD;
  v_steps jsonb := '[]'::jsonb;
  v_completed integer := 0;
  v_progress integer := 0;
BEGIN
  -- Access control: tenant users or super admin
  IF NOT (public.user_has_tenant_access(p_tenant_id) OR public.is_super_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Get latest workflow (prefer non-completed)
  SELECT *
  INTO v_workflow
  FROM public.onboarding_workflows
  WHERE tenant_id = p_tenant_id
  ORDER BY (status <> 'completed') DESC, created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'workflow', null, 'steps', '[]'::jsonb, 'progress', 0);
  END IF;

  -- Steps
  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.step_number), '[]'::jsonb)
  INTO v_steps
  FROM public.onboarding_steps s
  WHERE s.workflow_id = v_workflow.id;

  -- Compute progress
  SELECT COUNT(*) INTO v_completed
  FROM public.onboarding_steps s
  WHERE s.workflow_id = v_workflow.id
    AND s.step_status = 'completed';

  IF COALESCE(v_workflow.total_steps, 0) > 0 THEN
    v_progress := ROUND((v_completed::decimal / v_workflow.total_steps::decimal) * 100);
  ELSE
    v_progress := 0;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'workflow', to_jsonb(v_workflow),
    'steps', v_steps,
    'progress', v_progress
  );
END;
$$;

-- 4) Update step data and optionally change status safely
CREATE OR REPLACE FUNCTION public.set_onboarding_step_data(
  p_step_id uuid,
  p_step_data jsonb,
  p_new_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_step RECORD;
BEGIN
  -- Fetch and access-check via workflow/tenant
  SELECT s.*, w.tenant_id
  INTO v_step
  FROM public.onboarding_steps s
  JOIN public.onboarding_workflows w ON w.id = s.workflow_id
  WHERE s.id = p_step_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Step not found');
  END IF;

  IF NOT (public.user_has_tenant_access(v_step.tenant_id) OR public.is_super_admin()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Update step payload
  UPDATE public.onboarding_steps
  SET step_data = COALESCE(p_step_data, '{}'::jsonb),
      updated_at = now()
  WHERE id = p_step_id;

  -- Optional status change via existing transition function
  IF p_new_status IS NOT NULL THEN
    PERFORM public.advance_onboarding_step(p_step_id, p_new_status);
  END IF;

  RETURN jsonb_build_object('success', true, 'step_id', p_step_id);
END;
$$;

-- 5) Performance and safety: ensure helpful indexes exist
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_status_tenant ON public.onboarding_workflows(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_workflow_step ON public.onboarding_steps(workflow_id, step_number);
