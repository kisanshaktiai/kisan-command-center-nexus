
-- Fix the convert_lead_to_tenant_secure function to properly handle user_tenants creation
CREATE OR REPLACE FUNCTION public.convert_lead_to_tenant_secure(
  p_lead_id uuid,
  p_tenant_name text,
  p_tenant_slug text,
  p_subscription_plan text,
  p_admin_email text,
  p_admin_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_lead_record RECORD;
  v_tenant_id uuid;
  v_user_id uuid;
  v_temp_password text;
  v_existing_tenant RECORD;
  v_slug_check jsonb;
BEGIN
  -- Get and validate lead
  SELECT * INTO v_lead_record 
  FROM public.leads 
  WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead not found',
      'code', 'LEAD_NOT_FOUND'
    );
  END IF;

  -- Restrict conversion to qualified leads only
  IF v_lead_record.status != 'qualified' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only qualified leads can be converted to tenants',
      'code', 'LEAD_NOT_QUALIFIED'
    );
  END IF;

  -- Check if lead is already converted
  IF v_lead_record.status = 'converted' AND v_lead_record.converted_tenant_id IS NOT NULL THEN
    -- Check if tenant still exists
    SELECT * INTO v_existing_tenant 
    FROM public.tenants 
    WHERE id = v_lead_record.converted_tenant_id;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Lead has already been converted to an existing tenant',
        'code', 'LEAD_ALREADY_CONVERTED',
        'tenant_id', v_lead_record.converted_tenant_id
      );
    END IF;
  END IF;

  -- Validate slug availability
  v_slug_check := public.check_slug_availability(p_tenant_slug);
  IF NOT (v_slug_check->>'available')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_slug_check->>'error',
      'code', 'SLUG_CONFLICT'
    );
  END IF;

  -- Generate tenant ID and temporary password
  v_tenant_id := gen_random_uuid();
  v_temp_password := 'KSA' || upper(substring(encode(gen_random_bytes(6), 'base64'), 1, 8)) || '!';

  -- Create tenant
  INSERT INTO public.tenants (
    id,
    name,
    slug,
    type,
    status,
    subscription_plan,
    owner_name,
    owner_email,
    owner_phone,
    trial_ends_at,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    p_tenant_name,
    p_tenant_slug,
    'agri_company',
    'trial',
    p_subscription_plan,
    p_admin_name,
    p_admin_email,
    v_lead_record.phone,
    now() + interval '30 days',
    now(),
    now()
  );

  -- Create default tenant branding
  INSERT INTO public.tenant_branding (
    tenant_id,
    app_name,
    primary_color,
    secondary_color,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    p_tenant_name,
    'hsl(142, 76%, 36%)', -- Default green
    'hsl(142, 76%, 46%)', -- Lighter green
    now(),
    now()
  );

  -- Create default tenant features based on subscription plan
  INSERT INTO public.tenant_features (
    tenant_id,
    ai_chat,
    weather_forecast,
    marketplace,
    community_forum,
    satellite_imagery,
    soil_testing,
    basic_analytics,
    advanced_analytics,
    api_access,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    CASE WHEN p_subscription_plan IN ('AI_Enterprise', 'Shakti_Growth') THEN true ELSE false END,
    true, -- Weather always available
    CASE WHEN p_subscription_plan IN ('AI_Enterprise', 'Shakti_Growth') THEN true ELSE false END,
    true, -- Community always available
    CASE WHEN p_subscription_plan = 'AI_Enterprise' THEN true ELSE false END,
    CASE WHEN p_subscription_plan IN ('AI_Enterprise', 'Shakti_Growth') THEN true ELSE false END,
    true, -- Basic analytics always available
    CASE WHEN p_subscription_plan = 'AI_Enterprise' THEN true ELSE false END,
    CASE WHEN p_subscription_plan = 'AI_Enterprise' THEN true ELSE false END,
    now(),
    now()
  );

  -- Update lead status
  UPDATE public.leads 
  SET 
    status = 'converted',
    converted_tenant_id = v_tenant_id,
    converted_at = now(),
    updated_at = now(),
    notes = COALESCE(notes, '') || 
            CASE WHEN notes IS NOT NULL AND notes != '' THEN E'\n\n' ELSE '' END ||
            'Converted to tenant: ' || p_tenant_name || ' (' || p_tenant_slug || ') on ' || now()::date
  WHERE id = p_lead_id;

  -- Return success with all necessary data for user creation
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead converted to tenant successfully',
    'tenant_id', v_tenant_id,
    'temp_password', v_temp_password,
    'is_recovery', false
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Internal error during conversion: ' || SQLERRM,
      'code', 'INTERNAL_ERROR'
    );
END;
$$;

-- Create a diagnostic function to check conversion status
CREATE OR REPLACE FUNCTION public.get_conversion_diagnostics(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_tenant RECORD;
  v_user_tenant RECORD;
  v_auth_user RECORD;
  v_result jsonb := '{}';
BEGIN
  -- Get lead info
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lead not found');
  END IF;

  v_result := jsonb_build_object(
    'lead_id', v_lead.id,
    'lead_status', v_lead.status,
    'lead_email', v_lead.email,
    'converted_tenant_id', v_lead.converted_tenant_id,
    'converted_at', v_lead.converted_at
  );

  -- Check tenant if converted
  IF v_lead.converted_tenant_id IS NOT NULL THEN
    SELECT * INTO v_tenant FROM public.tenants WHERE id = v_lead.converted_tenant_id;
    
    v_result := v_result || jsonb_build_object(
      'tenant_exists', FOUND,
      'tenant_name', COALESCE(v_tenant.name, 'N/A'),
      'tenant_status', COALESCE(v_tenant.status, 'N/A')
    );

    -- Check auth user
    SELECT id, email, email_confirmed_at IS NOT NULL as email_confirmed
    INTO v_auth_user
    FROM auth.users 
    WHERE email = v_lead.email;
    
    v_result := v_result || jsonb_build_object(
      'auth_user_exists', FOUND,
      'auth_user_confirmed', COALESCE(v_auth_user.email_confirmed, false)
    );

    -- Check user_tenants relationship if auth user exists
    IF FOUND THEN
      SELECT * INTO v_user_tenant 
      FROM public.user_tenants 
      WHERE user_id = v_auth_user.id AND tenant_id = v_lead.converted_tenant_id;
      
      v_result := v_result || jsonb_build_object(
        'user_tenant_relation_exists', FOUND,
        'user_tenant_active', COALESCE(v_user_tenant.is_active, false),
        'user_tenant_role', COALESCE(v_user_tenant.role, 'N/A')
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$;
