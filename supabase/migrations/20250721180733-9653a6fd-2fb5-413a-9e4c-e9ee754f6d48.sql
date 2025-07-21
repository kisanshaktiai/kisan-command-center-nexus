
-- First, let's check if the billing_plans table has the correct structure
-- and add missing columns if they don't exist

-- Add missing columns to billing_plans table if they don't exist
DO $$ 
BEGIN
    -- Add plan_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_plans' AND column_name = 'plan_type') THEN
        ALTER TABLE public.billing_plans ADD COLUMN plan_type public.subscription_plan DEFAULT 'kisan'::public.subscription_plan;
    END IF;
    
    -- Add currency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_plans' AND column_name = 'currency') THEN
        ALTER TABLE public.billing_plans ADD COLUMN currency character varying DEFAULT 'INR';
    END IF;
    
    -- Add usage_limits column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_plans' AND column_name = 'usage_limits') THEN
        ALTER TABLE public.billing_plans ADD COLUMN usage_limits jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update existing billing_plans records to have proper plan_type based on name
UPDATE public.billing_plans 
SET plan_type = CASE 
    WHEN name ILIKE '%kisan%' OR name ILIKE '%basic%' THEN 'kisan'::public.subscription_plan
    WHEN name ILIKE '%shakti%' OR name ILIKE '%growth%' THEN 'shakti'::public.subscription_plan
    WHEN name ILIKE '%ai%' OR name ILIKE '%enterprise%' OR name ILIKE '%premium%' THEN 'ai'::public.subscription_plan
    ELSE 'kisan'::public.subscription_plan
END
WHERE plan_type IS NULL;

-- Set currency to INR for all existing records if not set
UPDATE public.billing_plans 
SET currency = 'INR' 
WHERE currency IS NULL OR currency = '';

-- Update usage_limits with default values if empty
UPDATE public.billing_plans 
SET usage_limits = CASE plan_type
    WHEN 'kisan' THEN '{"ai_queries": 100, "soil_reports": 2, "satellite_updates": 0, "max_lands": 3}'::jsonb
    WHEN 'shakti' THEN '{"ai_queries": 500, "soil_reports": -1, "satellite_updates": "weekly", "max_lands": 10}'::jsonb
    WHEN 'ai' THEN '{"ai_queries": -1, "soil_reports": -1, "satellite_updates": "daily", "max_lands": -1}'::jsonb
    ELSE '{}'::jsonb
END
WHERE usage_limits = '{}'::jsonb OR usage_limits IS NULL;

-- Make sure all tenants have valid subscription_plan values
UPDATE public.tenants 
SET subscription_plan = 'kisan'::public.subscription_plan
WHERE subscription_plan IS NULL;
