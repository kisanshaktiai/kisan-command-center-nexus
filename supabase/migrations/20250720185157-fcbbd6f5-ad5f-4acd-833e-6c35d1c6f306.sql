
-- Update the create_tenant_with_validation function to use correct subscription plan values
CREATE OR REPLACE FUNCTION public.create_tenant_with_validation(
  p_name TEXT,
  p_slug TEXT,
  p_type TEXT,
  p_status TEXT DEFAULT 'trial',
  p_subscription_plan TEXT DEFAULT 'starter',
  p_owner_name TEXT DEFAULT NULL,
  p_owner_email TEXT DEFAULT NULL,
  p_owner_phone TEXT DEFAULT NULL,
  p_business_registration TEXT DEFAULT NULL,
  p_business_address JSONB DEFAULT NULL,
  p_established_date TEXT DEFAULT NULL,
  p_subscription_start_date TEXT DEFAULT NULL,
  p_subscription_end_date TEXT DEFAULT NULL,
  p_trial_ends_at TEXT DEFAULT NULL,
  p_max_farmers INTEGER DEFAULT NULL,
  p_max_dealers INTEGER DEFAULT NULL,
  p_max_products INTEGER DEFAULT NULL,
  p_max_storage_gb INTEGER DEFAULT NULL,
  p_max_api_calls_per_day INTEGER DEFAULT NULL,
  p_subdomain TEXT DEFAULT NULL,
  p_custom_domain TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
  v_plan_limits JSONB;
  v_features_config JSONB;
  v_slug_check JSONB;
BEGIN
  -- Validate required fields
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant name is required',
      'code', 'VALIDATION_ERROR'
    );
  END IF;
  
  -- Use enhanced slug validation
  v_slug_check := public.check_slug_availability(p_slug);
  IF NOT (v_slug_check->>'available')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_slug_check->>'error',
      'code', v_slug_check->>'code'
    );
  END IF;
  
  -- Validate email format if provided
  IF p_owner_email IS NOT NULL AND p_owner_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email format',
      'code', 'VALIDATION_ERROR'
    );
  END IF;
  
  -- Validate subscription plan (updated to use correct enum values)
  IF p_subscription_plan NOT IN ('starter', 'growth', 'enterprise', 'custom') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid subscription plan. Must be one of: starter, growth, enterprise, custom',
      'code', 'VALIDATION_ERROR'
    );
  END IF;
  
  -- Validate tenant type
  IF p_type NOT IN ('agri_company', 'dealer', 'ngo', 'government', 'university', 'sugar_factory', 'cooperative', 'insurance') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid tenant type',
      'code', 'VALIDATION_ERROR'
    );
  END IF;
  
  -- Validate status
  IF p_status NOT IN ('trial', 'active', 'suspended', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status',
      'code', 'VALIDATION_ERROR'
    );
  END IF;
  
  -- Set default limits and features based on subscription plan (updated plan names)
  CASE p_subscription_plan
    WHEN 'starter' THEN
      v_plan_limits := jsonb_build_object(
        'farmers', 1000,
        'dealers', 50,
        'products', 100,
        'storage', 10,
        'api_calls', 10000
      );
      v_features_config := jsonb_build_object(
        'ai_chat', true,
        'weather_forecast', true,
        'marketplace', true,
        'community_forum', true,
        'satellite_imagery', true,
        'soil_testing', true,
        'drone_monitoring', false,
        'iot_integration', false,
        'ecommerce', true,
        'payment_gateway', false,
        'inventory_management', true,
        'logistics_tracking', false,
        'basic_analytics', true,
        'advanced_analytics', false,
        'predictive_analytics', false,
        'custom_reports', false,
        'api_access', false,
        'webhook_support', false,
        'third_party_integrations', false,
        'white_label_mobile_app', false
      );
    WHEN 'growth' THEN
      v_plan_limits := jsonb_build_object(
        'farmers', 5000,
        'dealers', 200,
        'products', 500,
        'storage', 50,
        'api_calls', 50000
      );
      v_features_config := jsonb_build_object(
        'ai_chat', true,
        'weather_forecast', true,
        'marketplace', true,
        'community_forum', true,
        'satellite_imagery', true,
        'soil_testing', true,
        'drone_monitoring', false,
        'iot_integration', false,
        'ecommerce', true,
        'payment_gateway', true,
        'inventory_management', true,
        'logistics_tracking', true,
        'basic_analytics', true,
        'advanced_analytics', true,
        'predictive_analytics', false,
        'custom_reports', true,
        'api_access', false,
        'webhook_support', false,
        'third_party_integrations', false,
        'white_label_mobile_app', false
      );
    WHEN 'enterprise' THEN
      v_plan_limits := jsonb_build_object(
        'farmers', 20000,
        'dealers', 1000,
        'products', 2000,
        'storage', 200,
        'api_calls', 200000
      );
      v_features_config := jsonb_build_object(
        'ai_chat', true,
        'weather_forecast', true,
        'marketplace', true,
        'community_forum', true,
        'satellite_imagery', true,
        'soil_testing', true,
        'drone_monitoring', true,
        'iot_integration', true,
        'ecommerce', true,
        'payment_gateway', true,
        'inventory_management', true,
        'logistics_tracking', true,
        'basic_analytics', true,
        'advanced_analytics', true,
        'predictive_analytics', true,
        'custom_reports', true,
        'api_access', true,
        'webhook_support', true,
        'third_party_integrations', true,
        'white_label_mobile_app', true
      );
    WHEN 'custom' THEN
      v_plan_limits := jsonb_build_object(
        'farmers', 50000,
        'dealers', 2000,
        'products', 5000,
        'storage', 500,
        'api_calls', 500000
      );
      v_features_config := jsonb_build_object(
        'ai_chat', true,
        'weather_forecast', true,
        'marketplace', true,
        'community_forum', true,
        'satellite_imagery', true,
        'soil_testing', true,
        'drone_monitoring', true,
        'iot_integration', true,
        'ecommerce', true,
        'payment_gateway', true,
        'inventory_management', true,
        'logistics_tracking', true,
        'basic_analytics', true,
        'advanced_analytics', true,
        'predictive_analytics', true,
        'custom_reports', true,
        'api_access', true,
        'webhook_support', true,
        'third_party_integrations', true,
        'white_label_mobile_app', true
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
  
  -- Begin transaction for atomic operations
  BEGIN
    -- Step 1: Insert tenant with proper enum casting
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
      p_type::tenant_type,
      p_status::tenant_status,
      p_subscription_plan::subscription_plan,
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
    
    -- Step 2: Create default tenant branding
    INSERT INTO tenant_branding (
      tenant_id,
      primary_color,
      secondary_color,
      accent_color,
      background_color,
      text_color,
      app_name,
      app_tagline,
      font_family,
      created_at,
      updated_at
    ) VALUES (
      v_tenant_id,
      '#10B981', -- Default primary color (green)
      '#065F46', -- Default secondary color (dark green)
      '#F59E0B', -- Default accent color (amber)
      '#FFFFFF', -- Default background color (white)
      '#111827', -- Default text color (dark gray)
      COALESCE(p_name, 'KisanShakti AI'), -- Use tenant name or default
      'Empowering Farmers with AI Technology', -- Default tagline
      'Inter', -- Default font
      now(),
      now()
    );
    
    -- Step 3: Create tenant features based on subscription plan
    INSERT INTO tenant_features (
      tenant_id,
      ai_chat,
      weather_forecast,
      marketplace,
      community_forum,
      satellite_imagery,
      soil_testing,
      drone_monitoring,
      iot_integration,
      ecommerce,
      payment_gateway,
      inventory_management,
      logistics_tracking,
      basic_analytics,
      advanced_analytics,
      predictive_analytics,
      custom_reports,
      api_access,
      webhook_support,
      third_party_integrations,
      white_label_mobile_app,
      created_at,
      updated_at
    ) VALUES (
      v_tenant_id,
      (v_features_config->>'ai_chat')::BOOLEAN,
      (v_features_config->>'weather_forecast')::BOOLEAN,
      (v_features_config->>'marketplace')::BOOLEAN,
      (v_features_config->>'community_forum')::BOOLEAN,
      (v_features_config->>'satellite_imagery')::BOOLEAN,
      (v_features_config->>'soil_testing')::BOOLEAN,
      (v_features_config->>'drone_monitoring')::BOOLEAN,
      (v_features_config->>'iot_integration')::BOOLEAN,
      (v_features_config->>'ecommerce')::BOOLEAN,
      (v_features_config->>'payment_gateway')::BOOLEAN,
      (v_features_config->>'inventory_management')::BOOLEAN,
      (v_features_config->>'logistics_tracking')::BOOLEAN,
      (v_features_config->>'basic_analytics')::BOOLEAN,
      (v_features_config->>'advanced_analytics')::BOOLEAN,
      (v_features_config->>'predictive_analytics')::BOOLEAN,
      (v_features_config->>'custom_reports')::BOOLEAN,
      (v_features_config->>'api_access')::BOOLEAN,
      (v_features_config->>'webhook_support')::BOOLEAN,
      (v_features_config->>'third_party_integrations')::BOOLEAN,
      (v_features_config->>'white_label_mobile_app')::BOOLEAN,
      now(),
      now()
    );
    
    -- Return comprehensive success response with proper structure for RpcResponse
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'tenant_id', v_tenant_id,
        'name', p_name,
        'slug', p_slug,
        'status', p_status,
        'subscription_plan', p_subscription_plan,
        'trial_ends_at', p_trial_ends_at,
        'limits', v_plan_limits,
        'features_enabled', v_features_config
      ),
      'message', 'Tenant created successfully with branding and features configured',
      'code', 'TENANT_CREATED'
    );
    
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Tenant with this slug already exists',
        'code', 'DUPLICATE_SLUG'
      );
    WHEN check_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid data provided - check constraint violation',
        'code', 'CONSTRAINT_VIOLATION'
      );
    WHEN foreign_key_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid reference data provided',
        'code', 'FOREIGN_KEY_VIOLATION'
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM,
        'code', 'DATABASE_ERROR'
      );
  END;
END;
$$;
