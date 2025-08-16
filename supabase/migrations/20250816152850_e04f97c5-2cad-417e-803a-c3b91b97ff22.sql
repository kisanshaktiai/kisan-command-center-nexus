
-- Add RLS policies for onboarding tables
ALTER TABLE public.onboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_step_templates ENABLE ROW LEVEL SECURITY;

-- Policies for onboarding_workflows
CREATE POLICY "Super admins can manage all workflows" ON public.onboarding_workflows
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenant users can view their workflow" ON public.onboarding_workflows
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policies for onboarding_steps
CREATE POLICY "Super admins can manage all steps" ON public.onboarding_steps
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenant users can manage their workflow steps" ON public.onboarding_steps
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM onboarding_workflows 
      WHERE tenant_id IN (
        SELECT tenant_id FROM user_tenants 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Policies for onboarding_step_templates
CREATE POLICY "Anyone can view step templates" ON public.onboarding_step_templates
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage step templates" ON public.onboarding_step_templates
  FOR ALL USING (is_super_admin());

-- Function to get or create onboarding workflow for tenant
CREATE OR REPLACE FUNCTION get_or_create_onboarding_workflow(p_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_id UUID;
  v_template RECORD;
  v_step_number INTEGER := 1;
BEGIN
  -- Check if workflow already exists
  SELECT id INTO v_workflow_id 
  FROM onboarding_workflows 
  WHERE tenant_id = p_tenant_id;
  
  IF v_workflow_id IS NOT NULL THEN
    RETURN v_workflow_id;
  END IF;
  
  -- Create new workflow
  INSERT INTO onboarding_workflows (
    tenant_id, 
    current_step, 
    total_steps, 
    status, 
    metadata
  ) VALUES (
    p_tenant_id,
    1,
    (SELECT COUNT(*) FROM onboarding_step_templates WHERE is_active = true),
    'in_progress',
    '{}'::jsonb
  ) RETURNING id INTO v_workflow_id;
  
  -- Create steps from templates
  FOR v_template IN 
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
      v_template.step_name,
      CASE WHEN v_step_number = 1 THEN 'pending' ELSE 'pending' END,
      v_template.default_data,
      '[]'::jsonb
    );
    
    v_step_number := v_step_number + 1;
  END LOOP;
  
  RETURN v_workflow_id;
END;
$$;

-- Function to advance onboarding step with better error handling
CREATE OR REPLACE FUNCTION advance_onboarding_step(
  p_step_id UUID,
  p_new_status TEXT,
  p_step_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_id UUID;
  v_step_number INTEGER;
  v_total_steps INTEGER;
  v_completed_steps INTEGER;
BEGIN
  -- Validate step status
  IF p_new_status NOT IN ('pending', 'in_progress', 'completed', 'skipped', 'failed') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid step status'
    );
  END IF;
  
  -- Update the step
  UPDATE onboarding_steps 
  SET 
    step_status = p_new_status,
    step_data = COALESCE(p_step_data, step_data),
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = p_step_id
  RETURNING workflow_id, step_number INTO v_workflow_id, v_step_number;
  
  -- Get workflow info
  SELECT total_steps INTO v_total_steps
  FROM onboarding_workflows
  WHERE id = v_workflow_id;
  
  -- Count completed steps
  SELECT COUNT(*) INTO v_completed_steps
  FROM onboarding_steps
  WHERE workflow_id = v_workflow_id AND step_status = 'completed';
  
  -- Update workflow current step and status
  UPDATE onboarding_workflows
  SET 
    current_step = GREATEST(current_step, v_step_number),
    status = CASE 
      WHEN v_completed_steps = v_total_steps THEN 'completed'
      WHEN p_new_status = 'failed' THEN 'failed'
      ELSE 'in_progress'
    END,
    completed_at = CASE 
      WHEN v_completed_steps = v_total_steps THEN NOW() 
      ELSE completed_at 
    END,
    updated_at = NOW()
  WHERE id = v_workflow_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'step_id', p_step_id,
    'new_status', p_new_status,
    'workflow_updated', true,
    'is_completed', v_completed_steps = v_total_steps
  );
END;
$$;
