
-- First, let's create the missing tables and fix the onboarding workflow structure

-- Create onboarding_workflows table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.onboarding_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 6,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create onboarding_steps table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.onboarding_workflows(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_status TEXT NOT NULL DEFAULT 'pending' CHECK (step_status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  step_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workflow_id, step_number)
);

-- Create user_invitations table for enhanced invitation system
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role user_role NOT NULL DEFAULT 'tenant_user',
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
  invitation_type TEXT NOT NULL DEFAULT 'onboarding',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'accepted', 'expired', 'cancelled')),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  sent_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create branding_presets table for quick preset functionality
CREATE TABLE IF NOT EXISTS public.branding_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  colors JSONB NOT NULL,
  fonts JSONB DEFAULT '{}',
  is_system_preset BOOLEAN DEFAULT true,
  preview_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default branding presets
INSERT INTO public.branding_presets (name, description, category, colors, fonts) VALUES
('Agriculture Green', 'Fresh green theme perfect for agricultural businesses', 'agriculture', 
 '{"primary": "#16a34a", "secondary": "#65a30d", "accent": "#84cc16", "background": "#f0fdf4", "text": "#166534"}',
 '{"primary": "Inter", "secondary": "Inter"}'),
('Professional Blue', 'Clean and professional blue theme for corporate use', 'professional',
 '{"primary": "#2563eb", "secondary": "#1d4ed8", "accent": "#3b82f6", "background": "#f8fafc", "text": "#1e293b"}',
 '{"primary": "Inter", "secondary": "Inter"}'),
('Modern Purple', 'Trendy purple theme for innovative companies', 'modern',
 '{"primary": "#7c3aed", "secondary": "#6d28d9", "accent": "#8b5cf6", "background": "#faf5ff", "text": "#581c87"}',
 '{"primary": "Inter", "secondary": "Inter"}'),
('Earthy Brown', 'Warm earthy tones for sustainable and organic businesses', 'agriculture',
 '{"primary": "#92400e", "secondary": "#78350f", "accent": "#a16207", "background": "#fffbeb", "text": "#451a03"}',
 '{"primary": "Inter", "secondary": "Inter"}'),
('Tech Orange', 'Vibrant orange theme for technology companies', 'tech',
 '{"primary": "#ea580c", "secondary": "#dc2626", "accent": "#f97316", "background": "#fff7ed", "text": "#9a3412"}',
 '{"primary": "Inter", "secondary": "Inter"}');

-- Add RLS policies
ALTER TABLE public.onboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_presets ENABLE ROW LEVEL SECURITY;

-- Onboarding workflows policies
CREATE POLICY "Super admins can manage all onboarding workflows" ON public.onboarding_workflows
  FOR ALL USING (is_authenticated_admin());

CREATE POLICY "Tenant users can view their workflows" ON public.onboarding_workflows
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Onboarding steps policies
CREATE POLICY "Super admins can manage all onboarding steps" ON public.onboarding_steps
  FOR ALL USING (is_authenticated_admin());

CREATE POLICY "Tenant users can manage their workflow steps" ON public.onboarding_steps
  FOR ALL USING (workflow_id IN (
    SELECT ow.id FROM onboarding_workflows ow
    INNER JOIN user_tenants ut ON ow.tenant_id = ut.tenant_id
    WHERE ut.user_id = auth.uid() AND ut.is_active = true
  ));

-- User invitations policies
CREATE POLICY "Super admins can manage all invitations" ON public.user_invitations
  FOR ALL USING (is_authenticated_admin());

CREATE POLICY "Tenant admins can manage their invitations" ON public.user_invitations
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND is_active = true 
    AND role IN ('tenant_owner', 'tenant_admin')
  ));

CREATE POLICY "Public can read invitations by token" ON public.user_invitations
  FOR SELECT USING (true);

-- Branding presets policies
CREATE POLICY "Everyone can view branding presets" ON public.branding_presets
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage branding presets" ON public.branding_presets
  FOR ALL USING (is_authenticated_admin());

-- Create function to advance onboarding step
CREATE OR REPLACE FUNCTION advance_onboarding_step(
  p_step_id TEXT,
  p_new_status TEXT,
  p_step_data JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_id UUID;
  v_step_number INTEGER;
  v_result JSONB;
BEGIN
  -- Extract workflow_id and step_number from step_id format: "workflow_id-step_number"
  v_workflow_id := (string_to_array(p_step_id, '-'))[1]::UUID;
  v_step_number := (string_to_array(p_step_id, '-'))[2]::INTEGER;
  
  -- Update the step
  UPDATE onboarding_steps 
  SET 
    step_status = p_new_status,
    step_data = p_step_data,
    completed_at = CASE WHEN p_new_status = 'completed' THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE workflow_id = v_workflow_id AND step_number = v_step_number;

  -- Update workflow progress
  UPDATE onboarding_workflows 
  SET 
    current_step = GREATEST(current_step, v_step_number + 1),
    status = CASE 
      WHEN (SELECT COUNT(*) FROM onboarding_steps WHERE workflow_id = v_workflow_id AND step_status = 'completed') = total_steps 
      THEN 'completed'
      ELSE 'in_progress'
    END,
    completed_at = CASE 
      WHEN (SELECT COUNT(*) FROM onboarding_steps WHERE workflow_id = v_workflow_id AND step_status = 'completed') = total_steps 
      THEN now() 
      ELSE NULL 
    END,
    updated_at = now()
  WHERE id = v_workflow_id;

  RETURN jsonb_build_object('success', true, 'message', 'Step updated successfully');
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_onboarding_workflows_updated_at
  BEFORE UPDATE ON onboarding_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_onboarding_steps_updated_at
  BEFORE UPDATE ON onboarding_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_branding_presets_updated_at
  BEFORE UPDATE ON branding_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
