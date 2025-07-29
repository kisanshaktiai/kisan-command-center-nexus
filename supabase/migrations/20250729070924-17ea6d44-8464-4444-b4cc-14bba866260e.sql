-- Phase 1: Create unified authentication and onboarding system (Fixed)

-- First, let's create a proper admin registration table that handles invites
CREATE TABLE IF NOT EXISTS public.admin_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  registration_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  registration_type TEXT NOT NULL DEFAULT 'invite', -- 'invite', 'bootstrap', 'self'
  invited_by UUID REFERENCES public.admin_users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired', 'rejected'
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for admin registrations
CREATE POLICY "Super admins can manage all registrations" ON public.admin_registrations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

CREATE POLICY "Platform admins can manage basic admin registrations" ON public.admin_registrations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role = 'platform_admin' 
      AND is_active = true
    )
    AND role NOT IN ('super_admin', 'platform_admin')
  );

CREATE POLICY "Public can read registrations by token" ON public.admin_registrations
  FOR SELECT TO anon
  USING (true);

-- Create onboarding workflows table
CREATE TABLE IF NOT EXISTS public.onboarding_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.admin_registrations(id) ON DELETE CASCADE,
  user_id UUID, -- Reference to auth.users but don't create foreign key constraint
  workflow_type TEXT NOT NULL, -- 'bootstrap', 'admin_invite', 'tenant_setup'
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  steps_data JSONB DEFAULT '[]',
  progress_percentage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_workflows ENABLE ROW LEVEL SECURITY;

-- Create policies for onboarding workflows
CREATE POLICY "Users can manage their own workflows" ON public.onboarding_workflows
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all workflows" ON public.onboarding_workflows
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

-- Create system configuration table for bootstrap settings
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policy for system config
CREATE POLICY "Super admins can manage system config" ON public.system_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

-- Insert initial system configuration
INSERT INTO public.system_config (config_key, config_value, description) VALUES
  ('bootstrap_completed', 'false', 'Whether the initial super admin bootstrap has been completed'),
  ('allow_self_registration', 'false', 'Whether users can self-register as basic admins'),
  ('email_verification_required', 'false', 'Whether email verification is required for admin accounts'),
  ('session_timeout_minutes', '480', 'Session timeout in minutes (8 hours)'),
  ('max_failed_login_attempts', '5', 'Maximum failed login attempts before lockout')
ON CONFLICT (config_key) DO NOTHING;

-- Create enhanced authentication functions
CREATE OR REPLACE FUNCTION public.is_bootstrap_completed()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (config_value::text)::boolean
  FROM public.system_config 
  WHERE config_key = 'bootstrap_completed';
$$;

CREATE OR REPLACE FUNCTION public.complete_bootstrap()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.system_config 
  SET config_value = 'true', updated_at = now()
  WHERE config_key = 'bootstrap_completed';
$$;

-- Function to create admin registration (for invites)
CREATE OR REPLACE FUNCTION public.create_admin_registration(
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'admin',
  p_registration_type TEXT DEFAULT 'invite',
  p_invited_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_registration_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Validate role permissions
  IF p_role IN ('super_admin', 'platform_admin') AND auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Insufficient permissions to create this role',
        'code', 'PERMISSION_DENIED'
      );
    END IF;
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE email = p_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email already registered as admin',
      'code', 'EMAIL_EXISTS'
    );
  END IF;

  -- Check if registration already exists
  IF EXISTS (
    SELECT 1 FROM public.admin_registrations 
    WHERE email = p_email 
    AND status = 'pending' 
    AND expires_at > now()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Active registration already exists for this email',
      'code', 'REGISTRATION_EXISTS'
    );
  END IF;

  -- Create registration
  INSERT INTO public.admin_registrations (
    email,
    full_name,
    role,
    registration_type,
    invited_by,
    expires_at
  ) VALUES (
    p_email,
    p_full_name,
    p_role,
    p_registration_type,
    p_invited_by,
    now() + interval '7 days'
  ) RETURNING id, registration_token, expires_at INTO v_registration_id, v_token, v_expires_at;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'registration_id', v_registration_id,
      'token', v_token,
      'email', p_email,
      'role', p_role,
      'expires_at', v_expires_at
    )
  );
END;
$$;

-- Function to validate and complete registration
CREATE OR REPLACE FUNCTION public.complete_admin_registration(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_registration RECORD;
  v_admin_id UUID;
BEGIN
  -- Get registration details
  SELECT * INTO v_registration
  FROM public.admin_registrations
  WHERE registration_token = p_token
  AND status = 'pending'
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired registration token',
      'code', 'INVALID_TOKEN'
    );
  END IF;

  -- Create admin user record
  INSERT INTO public.admin_users (
    id,
    email,
    full_name,
    role,
    is_active
  ) VALUES (
    p_user_id,
    v_registration.email,
    v_registration.full_name,
    v_registration.role,
    true
  ) RETURNING id INTO v_admin_id;

  -- Mark registration as completed
  UPDATE public.admin_registrations
  SET 
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = v_registration.id;

  -- If this is a bootstrap registration, mark bootstrap as completed
  IF v_registration.registration_type = 'bootstrap' THEN
    PERFORM public.complete_bootstrap();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'admin_id', v_admin_id,
      'email', v_registration.email,
      'role', v_registration.role,
      'registration_type', v_registration.registration_type
    )
  );
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_admin_registrations_updated_at
    BEFORE UPDATE ON public.admin_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_workflows_updated_at
    BEFORE UPDATE ON public.onboarding_workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();