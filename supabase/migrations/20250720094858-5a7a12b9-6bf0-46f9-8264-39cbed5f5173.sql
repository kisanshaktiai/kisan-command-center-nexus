-- Fix the create_tenant_with_validation function to properly handle enum types
CREATE OR REPLACE FUNCTION public.create_tenant_with_validation(
  p_name text,
  p_slug text,
  p_type text,
  p_status text DEFAULT 'trial'::text,
  p_subscription_plan text DEFAULT 'kisan'::text,
  p_owner_name text DEFAULT NULL::text,
  p_owner_email text DEFAULT NULL::text,
  p_owner_phone text DEFAULT NULL::text,
  p_business_registration text DEFAULT NULL::text,
  p_business_address jsonb DEFAULT NULL::jsonb,
  p_established_date text DEFAULT NULL::text,
  p_subscription_start_date text DEFAULT NULL::text,
  p_subscription_end_date text DEFAULT NULL::text,
  p_trial_ends_at text DEFAULT NULL::text,
  p_max_farmers integer DEFAULT NULL::integer,
  p_max_dealers integer DEFAULT NULL::integer,
  p_max_products integer DEFAULT NULL::integer,
  p_max_storage_gb integer DEFAULT NULL::integer,
  p_max_api_calls_per_day integer DEFAULT NULL::integer,
  p_subdomain text DEFAULT NULL::text,
  p_custom_domain text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
  v_plan_limits JSONB;
BEGIN
  -- Validate required fields
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant name is required'
    );
  END IF;
  
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant slug is required'
    );
  END IF;
  
  -- Validate slug format (alphanumeric and hyphens only)
  IF p_slug !~ '^[a-z0-9-]+$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slug must contain only lowercase letters, numbers, and hyphens'
    );
  END IF;
  
  -- Check if slug already exists
  IF EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant slug already exists'
    );
  END IF;
  
  -- Validate email format if provided
  IF p_owner_email IS NOT NULL AND p_owner_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;
  
  -- Validate subscription plan
  IF p_subscription_plan NOT IN ('kisan', 'shakti', 'ai') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid subscription plan'
    );
  END IF;
  
  -- Validate tenant type
  IF p_type NOT IN ('agri_company', 'dealer', 'ngo', 'government', 'university', 'sugar_factory', 'cooperative', 'insurance') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid tenant type'
    );
  END IF;
  
  -- Validate status
  IF p_status NOT IN ('trial', 'active', 'suspended', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status'
    );
  END IF;
  
  -- Set default limits based on subscription plan
  CASE p_subscription_plan
    WHEN 'kisan' THEN
      v_plan_limits := jsonb_build_object(
        'farmers', 1000,
        'dealers', 50,
        'products', 100,
        'storage', 10,
        'api_calls', 10000
      );
    WHEN 'shakti' THEN
      v_plan_limits := jsonb_build_object(
        'farmers', 5000,
        'dealers', 200,
        'products', 500,
        'storage', 50,
        'api_calls', 50000
      );
    WHEN 'ai' THEN
      v_plan_limits := jsonb_build_object(
        'farmers', 20000,
        'dealers', 1000,
        'products', 2000,
        'storage', 200,
        'api_calls', 200000
      );
  END CASE;
  
  -- Use provided limits or defaults
  p_max_farmers := COALESCE(p_max_farmers, (v_plan_limits->>'farmers')::INTEGER);
  p_max_dealers := COALESCE(p_max_dealers, (v_plan_limits->>'dealers')::INTEGER);
  p_max_products := COALESCE(p_max_products, (v_plan_limits->>'products')::INTEGER);
  p_max_storage_gb := COALESCE(p_max_storage_gb, (v_plan_limits->>'storage')::INTEGER);
  p_max_api_calls_per_day := COALESCE(p_max_api_calls_per_day, (v_plan_limits->>'api_calls')::INTEGER);
  
  -- Set default trial end date if not provided
  IF p_trial_ends_at IS NULL THEN
    p_trial_ends_at := (now() + interval '14 days')::TEXT;
  END IF;
  
  -- Insert tenant with proper enum casting
  INSERT INTO tenants (
    name,
    slug,
    type,
    status,
    subscription_plan,
    owner_name,
    owner_email,
    owner_phone,
    business_registration,
    business_address,
    established_date,
    subscription_start_date,
    subscription_end_date,
    trial_ends_at,
    max_farmers,
    max_dealers,
    max_products,
    max_storage_gb,
    max_api_calls_per_day,
    subdomain,
    custom_domain,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_slug,
    p_type::tenant_type,  -- Cast to enum type
    p_status::tenant_status,  -- Cast to enum type
    p_subscription_plan::subscription_plan,  -- Cast to enum type
    p_owner_name,
    p_owner_email,
    p_owner_phone,
    p_business_registration,
    p_business_address,
    CASE WHEN p_established_date IS NOT NULL THEN p_established_date::DATE ELSE NULL END,
    CASE WHEN p_subscription_start_date IS NOT NULL THEN p_subscription_start_date::TIMESTAMP WITH TIME ZONE ELSE now() END,
    CASE WHEN p_subscription_end_date IS NOT NULL THEN p_subscription_end_date::TIMESTAMP WITH TIME ZONE ELSE NULL END,
    p_trial_ends_at::TIMESTAMP WITH TIME ZONE,
    p_max_farmers,
    p_max_dealers,
    p_max_products,
    p_max_storage_gb,
    p_max_api_calls_per_day,
    p_subdomain,
    p_custom_domain,
    p_metadata,
    now(),
    now()
  ) RETURNING id INTO v_tenant_id;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'message', 'Tenant created successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;