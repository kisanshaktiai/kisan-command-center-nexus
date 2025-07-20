
-- Fix RLS infinite recursion by creating security definer functions
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
AS $$
  SELECT role FROM public.admin_users WHERE id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  );
$$;

-- Drop problematic recursive policies
DROP POLICY IF EXISTS "Admin users can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can manage all admin users" ON public.admin_users;

-- Create non-recursive policies using security definer functions
CREATE POLICY "Authenticated users can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can manage admin users via function" 
ON public.admin_users 
FOR ALL 
USING (public.is_admin_user());

-- Update subscription plan enum to standardize naming
-- First, update the database enum to match frontend expectations
ALTER TYPE public.subscription_plan RENAME TO subscription_plan_old;

CREATE TYPE public.subscription_plan AS ENUM ('kisan', 'shakti', 'ai');

-- Update tenants table to use new enum
ALTER TABLE public.tenants 
ALTER COLUMN subscription_plan TYPE public.subscription_plan 
USING CASE 
  WHEN subscription_plan::text = 'starter' THEN 'kisan'::public.subscription_plan
  WHEN subscription_plan::text = 'growth' THEN 'shakti'::public.subscription_plan  
  WHEN subscription_plan::text = 'enterprise' THEN 'ai'::public.subscription_plan
  WHEN subscription_plan::text = 'custom' THEN 'ai'::public.subscription_plan
  ELSE 'kisan'::public.subscription_plan
END;

-- Update billing_plans table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_plans' AND column_name = 'plan_type') THEN
        ALTER TABLE public.billing_plans 
        ALTER COLUMN plan_type TYPE public.subscription_plan 
        USING CASE 
          WHEN plan_type::text = 'starter' THEN 'kisan'::public.subscription_plan
          WHEN plan_type::text = 'growth' THEN 'shakti'::public.subscription_plan  
          WHEN plan_type::text = 'enterprise' THEN 'ai'::public.subscription_plan
          WHEN plan_type::text = 'custom' THEN 'ai'::public.subscription_plan
          ELSE 'kisan'::public.subscription_plan
        END;
    END IF;
END $$;

-- Drop old enum type
DROP TYPE IF EXISTS public.subscription_plan_old;

-- Update the create_tenant_with_validation function to use new enum values
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
  v_plan_limits JSONB;
BEGIN
  -- Validate required fields
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant name is required');
  END IF;
  
  IF p_slug IS NULL OR trim(p_slug) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant slug is required');
  END IF;
  
  -- Validate slug format
  IF p_slug !~ '^[a-z0-9-]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slug must contain only lowercase letters, numbers, and hyphens');
  END IF;
  
  -- Check if slug already exists
  IF EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant slug already exists');
  END IF;
  
  -- Validate subscription plan
  IF p_subscription_plan NOT IN ('kisan', 'shakti', 'ai') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid subscription plan');
  END IF;
  
  -- Set default limits based on subscription plan
  CASE p_subscription_plan
    WHEN 'kisan' THEN
      v_plan_limits := jsonb_build_object('farmers', 1000, 'dealers', 50, 'products', 100, 'storage', 10, 'api_calls', 10000);
    WHEN 'shakti' THEN
      v_plan_limits := jsonb_build_object('farmers', 5000, 'dealers', 200, 'products', 500, 'storage', 50, 'api_calls', 50000);
    WHEN 'ai' THEN
      v_plan_limits := jsonb_build_object('farmers', 20000, 'dealers', 1000, 'products', 2000, 'storage', 200, 'api_calls', 200000);
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
  
  -- Insert tenant
  INSERT INTO tenants (
    name, slug, type, status, subscription_plan, owner_name, owner_email, owner_phone,
    business_registration, business_address, established_date, subscription_start_date,
    subscription_end_date, trial_ends_at, max_farmers, max_dealers, max_products,
    max_storage_gb, max_api_calls_per_day, subdomain, custom_domain, metadata,
    created_at, updated_at
  ) VALUES (
    p_name, p_slug, p_type::TEXT, p_status::TEXT, p_subscription_plan::public.subscription_plan,
    p_owner_name, p_owner_email, p_owner_phone, p_business_registration, p_business_address,
    CASE WHEN p_established_date IS NOT NULL THEN p_established_date::DATE ELSE NULL END,
    CASE WHEN p_subscription_start_date IS NOT NULL THEN p_subscription_start_date::TIMESTAMP WITH TIME ZONE ELSE now() END,
    CASE WHEN p_subscription_end_date IS NOT NULL THEN p_subscription_end_date::TIMESTAMP WITH TIME ZONE ELSE NULL END,
    p_trial_ends_at::TIMESTAMP WITH TIME ZONE, p_max_farmers, p_max_dealers, p_max_products,
    p_max_storage_gb, p_max_api_calls_per_day, p_subdomain, p_custom_domain, p_metadata,
    now(), now()
  ) RETURNING id INTO v_tenant_id;
  
  RETURN jsonb_build_object('success', true, 'tenant_id', v_tenant_id, 'message', 'Tenant created successfully');
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_plan ON public.tenants(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_active ON public.admin_users(role, is_active);
