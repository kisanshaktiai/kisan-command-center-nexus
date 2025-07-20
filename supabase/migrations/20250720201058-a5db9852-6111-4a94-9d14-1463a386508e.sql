
-- COMPREHENSIVE TENANT CREATION SYSTEM FIX

-- Step 1: Fix infinite recursion in admin_users RLS policies
DROP POLICY IF EXISTS "Admin users can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage admin users" ON admin_users;

-- Create a simple, non-recursive function to check admin status
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  );
$$;

-- Create simple RLS policies that don't cause recursion
CREATE POLICY "Super admins can manage all admin users"
ON admin_users
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Step 2: Ensure subscription_plan enum is correct
DROP TYPE IF EXISTS subscription_plan CASCADE;
CREATE TYPE subscription_plan AS ENUM ('Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise', 'custom');

-- Step 3: Ensure tenant_type enum is correct  
DROP TYPE IF EXISTS tenant_type CASCADE;
CREATE TYPE tenant_type AS ENUM ('agri_company', 'dealer', 'ngo', 'government', 'university', 'sugar_factory', 'cooperative', 'insurance');

-- Step 4: Ensure tenant_status enum is correct
DROP TYPE IF EXISTS tenant_status CASCADE;
CREATE TYPE tenant_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');

-- Step 5: Update tenants table to use correct enums
ALTER TABLE tenants 
ALTER COLUMN subscription_plan TYPE subscription_plan 
USING subscription_plan::text::subscription_plan;

ALTER TABLE tenants 
ALTER COLUMN type TYPE tenant_type 
USING type::text::tenant_type;

ALTER TABLE tenants 
ALTER COLUMN status TYPE tenant_status 
USING status::text::tenant_status;

-- Step 6: Ensure tenants table has proper RLS policies
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON tenants;
CREATE POLICY "Super admins can manage all tenants" 
ON tenants
FOR ALL 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Step 7: Create the final, correct tenant creation function
CREATE OR REPLACE FUNCTION public.create_tenant_with_validation(
  p_name TEXT,
  p_slug TEXT,
  p_type TEXT,
  p_status TEXT DEFAULT 'trial',
  p_subscription_plan TEXT DEFAULT 'Kisan_Basic',
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
  IF p_subscription_plan NOT IN ('Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise', 'custom') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid subscription plan. Must be one of: Kisan_Basic, Shakti_Growth, AI_Enterprise, custom');
  END IF;
  
  -- Validate tenant type
  IF p_type NOT IN ('agri_company', 'dealer', 'ngo', 'government', 'university', 'sugar_factory', 'cooperative', 'insurance') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tenant type');
  END IF;
  
  -- Validate status
  IF p_status NOT IN ('trial', 'active', 'suspended', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;
  
  -- Set default limits based on subscription plan
  CASE p_subscription_plan
    WHEN 'Kisan_Basic' THEN
      v_plan_limits := jsonb_build_object('farmers', 1000, 'dealers', 50, 'products', 100, 'storage', 10, 'api_calls', 10000);
    WHEN 'Shakti_Growth' THEN
      v_plan_limits := jsonb_build_object('farmers', 5000, 'dealers', 200, 'products', 500, 'storage', 50, 'api_calls', 50000);
    WHEN 'AI_Enterprise' THEN
      v_plan_limits := jsonb_build_object('farmers', 20000, 'dealers', 1000, 'products', 2000, 'storage', 200, 'api_calls', 200000);
    WHEN 'custom' THEN
      v_plan_limits := jsonb_build_object('farmers', 50000, 'dealers', 2000, 'products', 5000, 'storage', 500, 'api_calls', 500000);
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
    p_name, p_slug, p_type::tenant_type, p_status::tenant_status, p_subscription_plan::subscription_plan,
    p_owner_name, p_owner_email, p_owner_phone, p_business_registration, p_business_address,
    CASE WHEN p_established_date IS NOT NULL THEN p_established_date::DATE ELSE NULL END,
    CASE WHEN p_subscription_start_date IS NOT NULL THEN p_subscription_start_date::TIMESTAMP WITH TIME ZONE ELSE now() END,
    CASE WHEN p_subscription_end_date IS NOT NULL THEN p_subscription_end_date::TIMESTAMP WITH TIME ZONE ELSE NULL END,
    p_trial_ends_at::TIMESTAMP WITH TIME ZONE, p_max_farmers, p_max_dealers, p_max_products,
    p_max_storage_gb, p_max_api_calls_per_day, p_subdomain, p_custom_domain, p_metadata,
    now(), now()
  ) RETURNING id INTO v_tenant_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'data', jsonb_build_object('tenant_id', v_tenant_id),
    'message', 'Tenant created successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_tenant_with_validation TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated;
