-- Seed enhanced tenant features for all subscription plans
-- Working with current enum values: starter, growth, enterprise, custom

-- First, let's update existing tenant features based on their current subscription plan
-- Enhanced Kisan (Starter) features - for 'starter' plan
UPDATE public.tenant_features 
SET 
  ai_chat = true,
  weather_forecast = true,
  marketplace = true,
  community_forum = true,
  soil_testing = true,
  satellite_imagery = true,
  ecommerce = true,
  inventory_management = true,
  basic_analytics = true,
  -- Set other features to false for starter plan
  payment_gateway = false,
  logistics_tracking = false,
  advanced_analytics = false,
  custom_reports = false,
  drone_monitoring = false,
  iot_integration = false,
  predictive_analytics = false,
  api_access = false,
  webhook_support = false,
  third_party_integrations = false,
  white_label_mobile_app = false,
  updated_at = now()
WHERE tenant_id IN (
  SELECT id FROM public.tenants WHERE subscription_plan = 'starter'
);

-- Enhanced Shakti (Growth) features - for 'growth' plan
UPDATE public.tenant_features 
SET 
  ai_chat = true,
  weather_forecast = true,
  marketplace = true,
  community_forum = true,
  soil_testing = true,
  satellite_imagery = true,
  ecommerce = true,
  inventory_management = true,
  basic_analytics = true,
  payment_gateway = true,
  logistics_tracking = true,
  advanced_analytics = true,
  custom_reports = true,
  -- Keep enterprise features disabled
  drone_monitoring = false,
  iot_integration = false,
  predictive_analytics = false,
  api_access = true,
  webhook_support = false,
  third_party_integrations = false,
  white_label_mobile_app = false,
  updated_at = now()
WHERE tenant_id IN (
  SELECT id FROM public.tenants WHERE subscription_plan = 'growth'
);

-- Enhanced AI PRO (Enterprise) features - for 'enterprise' plan - all features enabled
UPDATE public.tenant_features 
SET 
  ai_chat = true,
  weather_forecast = true,
  marketplace = true,
  community_forum = true,
  soil_testing = true,
  satellite_imagery = true,
  ecommerce = true,
  inventory_management = true,
  basic_analytics = true,
  payment_gateway = true,
  logistics_tracking = true,
  advanced_analytics = true,
  custom_reports = true,
  drone_monitoring = true,
  iot_integration = true,
  predictive_analytics = true,
  api_access = true,
  webhook_support = true,
  third_party_integrations = true,
  white_label_mobile_app = true,
  updated_at = now()
WHERE tenant_id IN (
  SELECT id FROM public.tenants WHERE subscription_plan = 'enterprise'
);

-- For custom plans, give them enterprise features
UPDATE public.tenant_features 
SET 
  ai_chat = true,
  weather_forecast = true,
  marketplace = true,
  community_forum = true,
  soil_testing = true,
  satellite_imagery = true,
  ecommerce = true,
  inventory_management = true,
  basic_analytics = true,
  payment_gateway = true,
  logistics_tracking = true,
  advanced_analytics = true,
  custom_reports = true,
  drone_monitoring = true,
  iot_integration = true,
  predictive_analytics = true,
  api_access = true,
  webhook_support = true,
  third_party_integrations = true,
  white_label_mobile_app = true,
  updated_at = now()
WHERE tenant_id IN (
  SELECT id FROM public.tenants WHERE subscription_plan = 'custom'
);

-- For any tenants that don't have features records yet, create them
-- This handles tenants that might have been created before tenant_features was populated

-- Insert features for Starter tenants without features
INSERT INTO public.tenant_features (
  tenant_id,
  ai_chat,
  weather_forecast,
  marketplace,
  community_forum,
  soil_testing,
  satellite_imagery,
  ecommerce,
  inventory_management,
  basic_analytics,
  payment_gateway,
  logistics_tracking,
  advanced_analytics,
  custom_reports,
  drone_monitoring,
  iot_integration,
  predictive_analytics,
  api_access,
  webhook_support,
  third_party_integrations,
  white_label_mobile_app,
  created_at,
  updated_at
)
SELECT 
  t.id,
  true, true, true, true, true, true, true, true, true,
  false, false, false, false, false, false, false, false, false, false, false,
  now(), now()
FROM public.tenants t
WHERE t.subscription_plan = 'starter'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_features tf WHERE tf.tenant_id = t.id
  );

-- Insert features for Growth tenants without features  
INSERT INTO public.tenant_features (
  tenant_id,
  ai_chat,
  weather_forecast,
  marketplace,
  community_forum,
  soil_testing,
  satellite_imagery,
  ecommerce,
  inventory_management,
  basic_analytics,
  payment_gateway,
  logistics_tracking,
  advanced_analytics,
  custom_reports,
  drone_monitoring,
  iot_integration,
  predictive_analytics,
  api_access,
  webhook_support,
  third_party_integrations,
  white_label_mobile_app,
  created_at,
  updated_at
)
SELECT 
  t.id,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true,
  false, false, false, true, false, false, false,
  now(), now()
FROM public.tenants t
WHERE t.subscription_plan = 'growth'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_features tf WHERE tf.tenant_id = t.id
  );

-- Insert features for Enterprise tenants without features
INSERT INTO public.tenant_features (
  tenant_id,
  ai_chat,
  weather_forecast,
  marketplace,
  community_forum,
  soil_testing,
  satellite_imagery,
  ecommerce,
  inventory_management,
  basic_analytics,
  payment_gateway,
  logistics_tracking,
  advanced_analytics,
  custom_reports,
  drone_monitoring,
  iot_integration,
  predictive_analytics,
  api_access,
  webhook_support,
  third_party_integrations,
  white_label_mobile_app,
  created_at,
  updated_at
)
SELECT 
  t.id,
  true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true, true, true,
  now(), now()
FROM public.tenants t
WHERE t.subscription_plan IN ('enterprise', 'custom')
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_features tf WHERE tf.tenant_id = t.id
  );