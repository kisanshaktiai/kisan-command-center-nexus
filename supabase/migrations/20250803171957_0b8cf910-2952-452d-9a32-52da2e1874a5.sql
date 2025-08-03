
-- Phase 1-3: Lead to Tenant Schema Alignment
-- This migration aligns the leads table structure with the tenants table for seamless conversion

-- Step 1: Add missing core tenant fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS business_registration character varying(100),
ADD COLUMN IF NOT EXISTS established_date date,
ADD COLUMN IF NOT EXISTS slug character varying(100),
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'Kisan_Basic',
ADD COLUMN IF NOT EXISTS subscription_start_date date,
ADD COLUMN IF NOT EXISTS subscription_end_date date,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS max_farmers integer,
ADD COLUMN IF NOT EXISTS max_dealers integer,
ADD COLUMN IF NOT EXISTS max_products integer,
ADD COLUMN IF NOT EXISTS max_storage_gb integer,
ADD COLUMN IF NOT EXISTS max_api_calls_per_day integer,
ADD COLUMN IF NOT EXISTS subdomain character varying(100),
ADD COLUMN IF NOT EXISTS custom_domain character varying(255);

-- Step 2: Restructure business_address to match tenant jsonb format
-- First, backup existing address data and convert to proper jsonb structure
UPDATE public.leads 
SET business_address = 
  CASE 
    WHEN business_address IS NOT NULL AND business_address != '{}' THEN
      jsonb_build_object(
        'street', COALESCE(business_address->>'address', business_address->>'street', ''),
        'city', COALESCE(business_address->>'city', ''),
        'state', COALESCE(business_address->>'state', ''),
        'postal_code', COALESCE(business_address->>'postal_code', business_address->>'zip', ''),
        'country', COALESCE(business_address->>'country', 'India')
      )
    ELSE 
      NULL
  END
WHERE business_address IS NOT NULL;

-- Step 3: Rename fields for direct mapping (using temporary columns to avoid data loss)
-- Add new columns with proper tenant field names
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS owner_name text,
ADD COLUMN IF NOT EXISTS owner_email text,
ADD COLUMN IF NOT EXISTS owner_phone character varying(20),
ADD COLUMN IF NOT EXISTS type text;

-- Migrate data from old fields to new fields
UPDATE public.leads SET 
  name = organization_name,
  owner_name = contact_name,
  owner_email = email,
  owner_phone = phone,
  type = COALESCE(organization_type, 'agri_company');

-- Set NOT NULL constraints on critical fields after data migration
ALTER TABLE public.leads 
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN owner_name SET NOT NULL,
ALTER COLUMN owner_email SET NOT NULL;

-- Step 4: Add enum constraints and proper data types
-- Create enum types if they don't exist (reuse tenant enums)
DO $$ 
BEGIN
    -- Check if tenant_type enum exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_type') THEN
        CREATE TYPE tenant_type AS ENUM ('agri_company', 'dealer', 'ngo', 'government', 'university', 'sugar_factory', 'cooperative', 'insurance');
    END IF;
    
    -- Check if subscription_plan enum exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
        CREATE TYPE subscription_plan AS ENUM ('Kisan_Basic', 'Shakti_Growth', 'AI_Enterprise', 'custom');
    END IF;
END $$;

-- Apply enum constraints
ALTER TABLE public.leads 
ALTER COLUMN type TYPE tenant_type USING type::tenant_type,
ALTER COLUMN subscription_plan TYPE subscription_plan USING subscription_plan::subscription_plan;

-- Step 5: Add proper defaults and constraints
ALTER TABLE public.leads 
ALTER COLUMN subscription_plan SET DEFAULT 'Kisan_Basic'::subscription_plan,
ALTER COLUMN type SET DEFAULT 'agri_company'::tenant_type,
ALTER COLUMN max_farmers SET DEFAULT 1000,
ALTER COLUMN max_dealers SET DEFAULT 50,
ALTER COLUMN max_products SET DEFAULT 100,
ALTER COLUMN max_storage_gb SET DEFAULT 10,
ALTER COLUMN max_api_calls_per_day SET DEFAULT 10000;

-- Step 6: Add unique constraint on slug (when populated)
CREATE UNIQUE INDEX IF NOT EXISTS leads_slug_unique 
ON public.leads (slug) 
WHERE slug IS NOT NULL AND slug != '';

-- Step 7: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_type ON public.leads (type);
CREATE INDEX IF NOT EXISTS idx_leads_subscription_plan ON public.leads (subscription_plan);
CREATE INDEX IF NOT EXISTS idx_leads_owner_email ON public.leads (owner_email);

-- Step 8: Drop old columns after successful migration (commented out for safety)
-- Uncomment these after verifying data migration is successful
-- ALTER TABLE public.leads 
-- DROP COLUMN IF EXISTS organization_name,
-- DROP COLUMN IF EXISTS contact_name,
-- DROP COLUMN IF EXISTS email,
-- DROP COLUMN IF EXISTS phone,
-- DROP COLUMN IF EXISTS organization_type;

-- Step 9: Update the convert_lead_to_tenant function for direct field mapping
CREATE OR REPLACE FUNCTION public.convert_lead_to_tenant(
    p_lead_id uuid, 
    p_tenant_name text DEFAULT NULL, 
    p_tenant_slug text DEFAULT NULL, 
    p_subscription_plan text DEFAULT 'Kisan_Basic',
    p_admin_email text DEFAULT NULL, 
    p_admin_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_lead_record RECORD;
    v_tenant_id uuid;
    v_invitation_token text;
    v_result jsonb;
    v_final_slug text;
    v_final_name text;
BEGIN
    -- Get lead details
    SELECT * INTO v_lead_record FROM public.leads WHERE id = p_lead_id AND status IN ('qualified', 'contacted');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead not found or not qualified');
    END IF;

    -- Use provided values or fall back to lead data (direct field mapping)
    v_final_name := COALESCE(p_tenant_name, v_lead_record.name);
    v_final_slug := COALESCE(p_tenant_slug, v_lead_record.slug);
    
    -- Generate slug if not provided
    IF v_final_slug IS NULL OR v_final_slug = '' THEN
        v_final_slug := lower(regexp_replace(v_final_name, '[^a-zA-Z0-9]+', '-', 'g'));
        v_final_slug := trim(v_final_slug, '-');
    END IF;

    -- Insert directly into tenants table with field mapping
    INSERT INTO public.tenants (
        name, slug, type, status, subscription_plan,
        owner_name, owner_email, owner_phone,
        business_registration, business_address, established_date,
        subscription_start_date, subscription_end_date, trial_ends_at,
        max_farmers, max_dealers, max_products, max_storage_gb, max_api_calls_per_day,
        subdomain, custom_domain, metadata,
        created_at, updated_at
    ) VALUES (
        v_final_name,
        v_final_slug,
        COALESCE(v_lead_record.type, 'agri_company'::tenant_type),
        'trial'::tenant_status,
        COALESCE(v_lead_record.subscription_plan, 'Kisan_Basic'::subscription_plan),
        COALESCE(p_admin_name, v_lead_record.owner_name),
        COALESCE(p_admin_email, v_lead_record.owner_email),
        v_lead_record.owner_phone,
        v_lead_record.business_registration,
        v_lead_record.business_address,
        v_lead_record.established_date,
        v_lead_record.subscription_start_date,
        v_lead_record.subscription_end_date,
        v_lead_record.trial_ends_at,
        COALESCE(v_lead_record.max_farmers, 1000),
        COALESCE(v_lead_record.max_dealers, 50),
        COALESCE(v_lead_record.max_products, 100),
        COALESCE(v_lead_record.max_storage_gb, 10),
        COALESCE(v_lead_record.max_api_calls_per_day, 10000),
        v_lead_record.subdomain,
        v_lead_record.custom_domain,
        COALESCE(v_lead_record.metadata, '{}'::jsonb),
        now(),
        now()
    ) RETURNING id INTO v_tenant_id;

    -- Generate invitation token
    v_invitation_token := encode(gen_random_bytes(32), 'base64');

    -- Create team invitation
    INSERT INTO public.team_invitations (
        lead_id, tenant_id, invited_email, invited_name, role, invitation_token, created_by
    ) VALUES (
        p_lead_id, v_tenant_id,
        COALESCE(p_admin_email, v_lead_record.owner_email),
        COALESCE(p_admin_name, v_lead_record.owner_name),
        'tenant_admin', v_invitation_token, auth.uid()
    );

    -- Update lead status
    UPDATE public.leads 
    SET 
        status = 'converted',
        converted_tenant_id = v_tenant_id,
        converted_at = now(),
        updated_at = now()
    WHERE id = p_lead_id;

    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'invitation_token', v_invitation_token,
        'message', 'Lead successfully converted to tenant using direct field mapping'
    );

    RETURN v_result;
END;
$function$;
