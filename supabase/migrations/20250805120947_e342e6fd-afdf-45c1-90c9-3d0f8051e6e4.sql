
-- Enhanced convert_lead_to_tenant_secure function with partial conversion recovery
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
    v_existing_tenant RECORD;
    v_tenant_id uuid;
    v_temp_password text;
    v_result jsonb;
    v_is_recovery boolean := false;
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
    WHERE id = p_lead_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Lead not found',
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

    -- Check for existing tenant with same slug
    SELECT * INTO v_existing_tenant 
    FROM public.tenants 
    WHERE slug = p_tenant_slug;

    IF v_existing_tenant.id IS NOT NULL THEN
        -- Check if this is a partial conversion (same lead created the tenant)
        IF v_existing_tenant.metadata->>'converted_from_lead' = p_lead_id::text THEN
            -- This is a recovery scenario - complete the partial conversion
            v_tenant_id := v_existing_tenant.id;
            v_is_recovery := true;
            
            -- Update lead status to complete the conversion
            UPDATE public.leads 
            SET 
                status = 'converted',
                converted_tenant_id = v_tenant_id,
                converted_at = now(),
                updated_at = now(),
                notes = COALESCE(notes, '') || ' | Conversion completed (recovered from partial state)'
            WHERE id = p_lead_id;
            
        ELSE
            -- Genuine slug conflict
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Tenant slug already exists',
                'code', 'SLUG_CONFLICT'
            );
        END IF;
    ELSE
        -- No existing tenant, proceed with normal creation
        IF v_lead_record.status NOT IN ('new', 'assigned', 'contacted', 'qualified') THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Lead is not in a convertible status',
                'code', 'LEAD_NOT_CONVERTIBLE'
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
                'conversion_date', now(),
                'conversion_method', 'lead_conversion'
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
    END IF;

    -- Generate temp password if not recovery
    IF NOT v_is_recovery THEN
        v_temp_password := encode(gen_random_bytes(12), 'base64');
    END IF;

    -- Return success result
    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'temp_password', COALESCE(v_temp_password, 'recovery-no-password'),
        'message', CASE 
            WHEN v_is_recovery THEN 'Lead conversion completed (recovered from partial state)'
            ELSE 'Lead converted to tenant successfully'
        END,
        'tenant_slug', p_tenant_slug,
        'is_recovery', v_is_recovery
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'code', 'INTERNAL_ERROR',
            'details', SQLSTATE
        );
END;
$$;
