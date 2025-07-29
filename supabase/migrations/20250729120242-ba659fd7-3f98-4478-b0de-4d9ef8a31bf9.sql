-- Fix security warnings: Add SET search_path = '' to all functions without it

-- Fix generate_otp function
DROP FUNCTION IF EXISTS public.generate_otp(integer);
CREATE OR REPLACE FUNCTION public.generate_otp(p_length integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  chars text := '0123456789';
  result text := '';
  i integer := 0;
  rand integer := 0;
BEGIN
  FOR i IN 1..p_length LOOP
    rand := floor(random() * length(chars)) + 1;
    result := result || substr(chars, rand, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Fix handle_updated_at function
DROP FUNCTION IF EXISTS public.handle_updated_at();
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix calculate_evapotranspiration function
DROP FUNCTION IF EXISTS public.calculate_evapotranspiration(numeric, integer, numeric, numeric);
CREATE OR REPLACE FUNCTION public.calculate_evapotranspiration(temp_celsius numeric, humidity_percent integer, wind_speed_kmh numeric, solar_radiation numeric DEFAULT 15)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Simplified Penman-Monteith equation for reference evapotranspiration
  RETURN ROUND(
    (0.0023 * (temp_celsius + 17.8) * SQRT(ABS(humidity_percent - 50)) * 
     (solar_radiation / 2.45) * (1 + wind_speed_kmh / 67))::DECIMAL, 2
  );
END;
$$;

-- Fix calculate_growing_degree_days function
DROP FUNCTION IF EXISTS public.calculate_growing_degree_days(numeric, numeric, numeric);
CREATE OR REPLACE FUNCTION public.calculate_growing_degree_days(temp_max numeric, temp_min numeric, base_temp numeric DEFAULT 10)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN GREATEST(0, ((temp_max + temp_min) / 2) - base_temp);
END;
$$;

-- Fix get_spray_suitability function
DROP FUNCTION IF EXISTS public.get_spray_suitability(numeric, numeric, integer, integer);
CREATE OR REPLACE FUNCTION public.get_spray_suitability(temp_celsius numeric, wind_speed_kmh numeric, humidity_percent integer, rain_probability_percent integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  score INTEGER := 100;
BEGIN
  IF temp_celsius < 10 OR temp_celsius > 35 THEN
    score := score - 30;
  END IF;
  
  IF wind_speed_kmh > 15 THEN
    score := score - 25;
  END IF;
  
  IF humidity_percent > 85 THEN
    score := score - 20;
  END IF;
  
  IF rain_probability_percent > 20 THEN
    score := score - (rain_probability_percent - 20);
  END IF;
  
  RETURN GREATEST(0, score);
END;
$$;

-- Fix update_weather_preferences_updated_at function
DROP FUNCTION IF EXISTS public.update_weather_preferences_updated_at();
CREATE OR REPLACE FUNCTION public.update_weather_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix disable_expired_tenant_features function
DROP FUNCTION IF EXISTS public.disable_expired_tenant_features();
CREATE OR REPLACE FUNCTION public.disable_expired_tenant_features()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update tenant_features to disable features for expired subscriptions
  UPDATE public.tenant_features 
  SET 
    ai_chat = false,
    weather_forecast = false,
    marketplace = false,
    community_forum = false,
    satellite_imagery = false,
    soil_testing = false,
    drone_monitoring = false,
    iot_integration = false,
    ecommerce = false,
    payment_gateway = false,
    inventory_management = false,
    logistics_tracking = false,
    basic_analytics = false,
    advanced_analytics = false,
    predictive_analytics = false,
    custom_reports = false,
    api_access = false,
    webhook_support = false,
    third_party_integrations = false,
    white_label_mobile_app = false,
    updated_at = now()
  WHERE tenant_id IN (
    SELECT t.id 
    FROM public.tenants t
    JOIN public.tenant_subscriptions ts ON t.id = ts.tenant_id
    WHERE ts.current_period_end < CURRENT_DATE 
    AND ts.status = 'active'
  );
  
  -- Update subscription status to expired
  UPDATE public.tenant_subscriptions 
  SET 
    status = 'past_due',
    updated_at = now()
  WHERE current_period_end < CURRENT_DATE 
  AND status = 'active';
END;
$$;

-- Fix update_active_sessions_timestamp function
DROP FUNCTION IF EXISTS public.update_active_sessions_timestamp();
CREATE OR REPLACE FUNCTION public.update_active_sessions_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix increment_branding_version function
DROP FUNCTION IF EXISTS public.increment_branding_version();
CREATE OR REPLACE FUNCTION public.increment_branding_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;