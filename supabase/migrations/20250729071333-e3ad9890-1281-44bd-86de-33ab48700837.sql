-- Phase 2: Enable RLS and add security policies

-- Enable RLS on all new tables
ALTER TABLE public.admin_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_registrations
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

-- Create policies for onboarding_workflows
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

-- Create policies for system_config  
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

-- Create enhanced authentication functions
CREATE OR REPLACE FUNCTION public.is_bootstrap_completed()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((config_value::text)::boolean, false)
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