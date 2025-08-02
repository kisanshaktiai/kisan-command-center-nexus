
-- Fix lead conversion logic to only allow qualified leads
CREATE OR REPLACE FUNCTION convert_lead_to_tenant(
  p_lead_id UUID,
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_subscription_plan TEXT DEFAULT 'Kisan_Basic',
  p_admin_email TEXT DEFAULT NULL,
  p_admin_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_tenant_id UUID;
  v_result JSON;
BEGIN
  -- Get the lead and lock it
  SELECT * INTO v_lead
  FROM leads
  WHERE id = p_lead_id
  FOR UPDATE;

  -- Check if lead exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'LEAD_NOT_FOUND',
      'message', 'Lead not found'
    );
  END IF;

  -- Check if lead is qualified (CRITICAL: Only qualified leads can be converted)
  IF v_lead.status != 'qualified' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'LEAD_NOT_QUALIFIED',
      'message', 'Only qualified leads can be converted to tenants. Current status: ' || v_lead.status
    );
  END IF;

  -- Check if lead is already converted
  IF v_lead.status = 'converted' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ALREADY_CONVERTED',
      'message', 'Lead has already been converted to a tenant'
    );
  END IF;

  -- Generate tenant ID
  v_tenant_id := gen_random_uuid();

  -- Create tenant record
  INSERT INTO tenants (
    id,
    name,
    slug,
    subscription_plan,
    trial_ends_at,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    p_tenant_name,
    p_tenant_slug,
    p_subscription_plan,
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  );

  -- Update lead status to converted and link to tenant
  UPDATE leads
  SET 
    status = 'converted',
    updated_at = NOW()
  WHERE id = p_lead_id;

  -- Build successful result
  v_result := json_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'message', 'Lead successfully converted to tenant'
  );

  RETURN v_result;

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'TENANT_SLUG_EXISTS',
      'message', 'Tenant slug already exists. Please choose a different slug.'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'CONVERSION_FAILED',
      'message', 'Failed to convert lead to tenant: ' || SQLERRM
    );
END;
$$;
