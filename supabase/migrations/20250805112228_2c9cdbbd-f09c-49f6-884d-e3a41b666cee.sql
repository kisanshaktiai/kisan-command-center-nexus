
-- Fix user_role enum to include proper tenant admin role
DO $$ 
BEGIN
    -- Check if tenant_admin already exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tenant_admin' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'tenant_admin';
    END IF;
END $$;

-- Create a dedicated function for lead conversion that bypasses RLS issues
CREATE OR REPLACE FUNCTION public.convert_lead_to_tenant_secure(
    p_lead_id uuid,
    p_tenant_name text,
    p_tenant_slug text,
    p_subscription_plan text DEFAULT 'Kisan_Basic',
    p_admin_email text DEFAULT NULL,
    p_admin_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lead_record RECORD;
    v_tenant_id uuid;
    v_user_id uuid;
    v_temp_password text;
    v_result jsonb;
BEGIN
    -- Validate inputs
    IF p_lead_id IS NULL OR p_tenant_name IS NULL OR p_tenant_slug IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Missing required parameters',
            'code', 'VALIDATION_ERROR'
        );
    END IF;

    -- Get and validate lead
    SELECT * INTO v_lead_record 
    FROM public.leads 
    WHERE id = p_lead_id AND status IN ('new', 'assigned', 'contacted', 'qualified');
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Lead not found or not in convertible status',
            'code', 'LEAD_NOT_FOUND'
        );
    END IF;

    -- Check if lead is already converted
    IF v_lead_record.status = 'converted' AND v_lead_record.converted_tenant_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Lead has already been converted',
            'code', 'LEAD_ALREADY_CONVERTED'
        );
    END IF;

    -- Check slug availability
    IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = p_tenant_slug) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tenant slug already exists',
            'code', 'SLUG_CONFLICT'
        );
    END IF;

    -- Generate temp password
    v_temp_password := encode(gen_random_bytes(12), 'base64');

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
        trial_ends_at,
        settings,
        metadata
    ) VALUES (
        gen_random_uuid(),
        p_tenant_name,
        p_tenant_slug,
        'agri_company',
        'trial',
        p_subscription_plan,
        COALESCE(p_admin_name, v_lead_record.contact_name),
        COALESCE(p_admin_email, v_lead_record.email),
        now() + interval '30 days',
        jsonb_build_object(
            'features', jsonb_build_object(
                'basic_analytics', true,
                'farmer_management', true,
                'communication_tools', true
            ),
            'limits', jsonb_build_object(
                'max_farmers', CASE p_subscription_plan 
                    WHEN 'Kisan_Basic' THEN 1000
                    WHEN 'Shakti_Growth' THEN 5000
                    ELSE 20000
                END,
                'max_dealers', CASE p_subscription_plan
                    WHEN 'Kisan_Basic' THEN 50
                    WHEN 'Shakti_Growth' THEN 200
                    ELSE 1000
                END
            )
        ),
        jsonb_build_object(
            'converted_from_lead', p_lead_id,
            'conversion_date', now()
        )
    ) RETURNING id INTO v_tenant_id;

    -- Update lead status
    UPDATE public.leads 
    SET 
        status = 'converted',
        converted_tenant_id = v_tenant_id,
        converted_at = now(),
        updated_at = now(),
        notes = COALESCE(notes, '') || ' | Converted to tenant: ' || p_tenant_name
    WHERE id = p_lead_id;

    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'temp_password', v_temp_password,
        'message', 'Lead converted to tenant successfully',
        'tenant_slug', p_tenant_slug
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'INTERNAL_ERROR'
        );
END;
$$;

-- Update RLS policies to be more permissive for service role operations
DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;
CREATE POLICY "Super admins can manage all tenants" 
ON public.tenants 
FOR ALL
USING (
    auth.role() = 'service_role' OR
    is_authenticated_admin() OR 
    auth.uid() IN (
        SELECT user_id FROM user_tenants 
        WHERE tenant_id = tenants.id 
        AND role = 'tenant_admin' 
        AND is_active = true
    )
)
WITH CHECK (
    auth.role() = 'service_role' OR
    is_authenticated_admin() OR 
    auth.uid() IN (
        SELECT user_id FROM user_tenants 
        WHERE tenant_id = tenants.id 
        AND role = 'tenant_admin' 
        AND is_active = true
    )
);

-- Update leads RLS policy for service role
DROP POLICY IF EXISTS "Super admins can manage all leads" ON public.leads;
CREATE POLICY "Super admins can manage all leads" 
ON public.leads 
FOR ALL
USING (
    auth.role() = 'service_role' OR
    is_authenticated_admin()
)
WITH CHECK (
    auth.role() = 'service_role' OR
    is_authenticated_admin()
);
