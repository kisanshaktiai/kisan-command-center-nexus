
-- Fix RLS policies for onboarding_workflows table
DROP POLICY IF EXISTS "Users can view onboarding workflows" ON public.onboarding_workflows;
DROP POLICY IF EXISTS "Users can create onboarding workflows" ON public.onboarding_workflows;
DROP POLICY IF EXISTS "Users can update onboarding workflows" ON public.onboarding_workflows;

-- Create proper RLS policies for onboarding_workflows
CREATE POLICY "Super admins can manage all onboarding workflows" 
ON public.onboarding_workflows 
FOR ALL 
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Tenant admins can manage workflows for their tenants" 
ON public.onboarding_workflows 
FOR ALL 
TO authenticated
USING (
  tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() 
    AND user_tenants.is_active = true 
    AND user_tenants.role IN ('tenant_admin', 'tenant_owner')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT user_tenants.tenant_id 
    FROM user_tenants 
    WHERE user_tenants.user_id = auth.uid() 
    AND user_tenants.is_active = true 
    AND user_tenants.role IN ('tenant_admin', 'tenant_owner')
  )
);

-- Fix RLS policies for onboarding_steps table
DROP POLICY IF EXISTS "Users can view onboarding steps" ON public.onboarding_steps;
DROP POLICY IF EXISTS "Users can update onboarding steps" ON public.onboarding_steps;

CREATE POLICY "Super admins can manage all onboarding steps" 
ON public.onboarding_steps 
FOR ALL 
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Tenant admins can manage steps for their workflows" 
ON public.onboarding_steps 
FOR ALL 
TO authenticated
USING (
  workflow_id IN (
    SELECT ow.id 
    FROM onboarding_workflows ow
    JOIN user_tenants ut ON ow.tenant_id = ut.tenant_id
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.role IN ('tenant_admin', 'tenant_owner')
  )
)
WITH CHECK (
  workflow_id IN (
    SELECT ow.id 
    FROM onboarding_workflows ow
    JOIN user_tenants ut ON ow.tenant_id = ut.tenant_id
    WHERE ut.user_id = auth.uid() 
    AND ut.is_active = true 
    AND ut.role IN ('tenant_admin', 'tenant_owner')
  )
);

-- Enable realtime for onboarding tables
ALTER TABLE public.onboarding_workflows REPLICA IDENTITY FULL;
ALTER TABLE public.onboarding_steps REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_steps;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_tenant_id ON public.onboarding_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_status ON public.onboarding_workflows(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_workflow_id ON public.onboarding_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_status ON public.onboarding_steps(step_status);

-- Add function to get onboarding templates based on tenant type
CREATE OR REPLACE FUNCTION get_onboarding_template(tenant_type TEXT, subscription_plan TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template JSONB;
BEGIN
  -- Define templates based on tenant type and subscription
  CASE 
    WHEN subscription_plan = 'AI_Enterprise' THEN
      template := '[
        {"step": 1, "name": "Business Verification", "description": "Verify GST, PAN, and business documents", "required": true, "estimated_time": 30},
        {"step": 2, "name": "Subscription Setup", "description": "Configure enterprise subscription and billing", "required": true, "estimated_time": 15},
        {"step": 3, "name": "Advanced Branding", "description": "Set up custom branding and white-label configuration", "required": true, "estimated_time": 45},
        {"step": 4, "name": "Feature Configuration", "description": "Configure AI features and advanced analytics", "required": true, "estimated_time": 60},
        {"step": 5, "name": "Data Migration", "description": "Import existing data and integrate with external systems", "required": true, "estimated_time": 120},
        {"step": 6, "name": "Team Setup", "description": "Create admin accounts and set up team structure", "required": true, "estimated_time": 30},
        {"step": 7, "name": "Security Configuration", "description": "Set up SSO, API keys, and security policies", "required": true, "estimated_time": 45},
        {"step": 8, "name": "Go-Live Testing", "description": "Comprehensive testing and validation", "required": true, "estimated_time": 90}
      ]'::JSONB;
    WHEN subscription_plan = 'Shakti_Growth' THEN
      template := '[
        {"step": 1, "name": "Business Verification", "description": "Verify GST, PAN, and business documents", "required": true, "estimated_time": 30},
        {"step": 2, "name": "Subscription Plan", "description": "Select and configure growth plan features", "required": true, "estimated_time": 15},
        {"step": 3, "name": "Branding Configuration", "description": "Set up logo, colors, and basic branding", "required": true, "estimated_time": 30},
        {"step": 4, "name": "Feature Selection", "description": "Choose growth features and set limits", "required": true, "estimated_time": 45},
        {"step": 5, "name": "Data Import", "description": "Import farmer and product data", "required": true, "estimated_time": 60},
        {"step": 6, "name": "Team Invites", "description": "Invite team members and assign roles", "required": true, "estimated_time": 20}
      ]'::JSONB;
    ELSE -- Kisan_Basic
      template := '[
        {"step": 1, "name": "Business Verification", "description": "Verify GST, PAN, and business documents", "required": true, "estimated_time": 30},
        {"step": 2, "name": "Basic Setup", "description": "Configure basic subscription and features", "required": true, "estimated_time": 15},
        {"step": 3, "name": "Simple Branding", "description": "Set up basic logo and colors", "required": false, "estimated_time": 15},
        {"step": 4, "name": "Essential Features", "description": "Configure core features for basic plan", "required": true, "estimated_time": 30},
        {"step": 5, "name": "Quick Data Import", "description": "Import basic farmer data", "required": false, "estimated_time": 30},
        {"step": 6, "name": "Admin Setup", "description": "Create admin account", "required": true, "estimated_time": 10}
      ]'::JSONB;
  END CASE;
  
  RETURN template;
END;
$$;

-- Add function to calculate completion percentage
CREATE OR REPLACE FUNCTION calculate_onboarding_progress(workflow_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_steps INTEGER;
  completed_steps INTEGER;
  progress INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_steps 
  FROM onboarding_steps 
  WHERE workflow_id = calculate_onboarding_progress.workflow_id;
  
  SELECT COUNT(*) INTO completed_steps 
  FROM onboarding_steps 
  WHERE workflow_id = calculate_onboarding_progress.workflow_id 
  AND step_status = 'completed';
  
  IF total_steps = 0 THEN
    RETURN 0;
  END IF;
  
  progress := ROUND((completed_steps::DECIMAL / total_steps::DECIMAL) * 100);
  
  RETURN progress;
END;
$$;
