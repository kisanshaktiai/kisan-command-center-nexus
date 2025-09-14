
-- Create universal user_tenants management function
-- This function handles insert/update of user_tenants records with validation and error handling

CREATE OR REPLACE FUNCTION public.manage_user_tenant_relationship(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role user_role,
  p_is_active boolean DEFAULT true,
  p_metadata jsonb DEFAULT '{}',
  p_operation text DEFAULT 'upsert' -- 'insert', 'update', or 'upsert'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_relationship_id uuid;
  v_existing_record RECORD;
  v_result jsonb;
  v_operation_performed text;
  v_tenant_exists boolean;
  v_user_exists boolean;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User ID cannot be null',
      'code', 'INVALID_USER_ID'
    );
  END IF;

  IF p_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant ID cannot be null',
      'code', 'INVALID_TENANT_ID'
    );
  END IF;

  IF p_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Role cannot be null',
      'code', 'INVALID_ROLE'
    );
  END IF;

  -- Validate that user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User does not exist',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Validate that tenant exists
  SELECT EXISTS(
    SELECT 1 FROM public.tenants WHERE id = p_tenant_id
  ) INTO v_tenant_exists;

  IF NOT v_tenant_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant does not exist',
      'code', 'TENANT_NOT_FOUND'
    );
  END IF;

  -- Check for existing relationship
  SELECT * INTO v_existing_record
  FROM public.user_tenants
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

  -- Handle different operations
  IF p_operation = 'insert' THEN
    -- Insert only - fail if relationship exists
    IF v_existing_record IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'User-tenant relationship already exists',
        'code', 'RELATIONSHIP_EXISTS',
        'existing_relationship_id', v_existing_record.id
      );
    END IF;

    -- Insert new relationship
    INSERT INTO public.user_tenants (
      user_id, tenant_id, role, is_active, metadata, created_at, updated_at
    ) VALUES (
      p_user_id, p_tenant_id, p_role, p_is_active, p_metadata, now(), now()
    ) RETURNING id INTO v_relationship_id;

    v_operation_performed := 'created';

  ELSIF p_operation = 'update' THEN
    -- Update only - fail if relationship doesn't exist
    IF v_existing_record IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'User-tenant relationship does not exist',
        'code', 'RELATIONSHIP_NOT_FOUND'
      );
    END IF;

    -- Update existing relationship
    UPDATE public.user_tenants
    SET 
      role = p_role,
      is_active = p_is_active,
      metadata = p_metadata,
      updated_at = now()
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id
    RETURNING id INTO v_relationship_id;

    v_operation_performed := 'updated';

  ELSE -- 'upsert' (default)
    -- Upsert - insert if not exists, update if exists
    IF v_existing_record IS NOT NULL THEN
      -- Update existing relationship
      UPDATE public.user_tenants
      SET 
        role = p_role,
        is_active = p_is_active,
        metadata = COALESCE(p_metadata, metadata),
        updated_at = now()
      WHERE user_id = p_user_id AND tenant_id = p_tenant_id
      RETURNING id INTO v_relationship_id;

      v_operation_performed := 'updated';
    ELSE
      -- Insert new relationship
      INSERT INTO public.user_tenants (
        user_id, tenant_id, role, is_active, metadata, created_at, updated_at
      ) VALUES (
        p_user_id, p_tenant_id, p_role, p_is_active, p_metadata, now(), now()
      ) RETURNING id INTO v_relationship_id;

      v_operation_performed := 'created';
    END IF;
  END IF;

  -- Log the operation for audit trail
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    details,
    created_at
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
    'user_tenant_relationship_' || v_operation_performed,
    jsonb_build_object(
      'user_id', p_user_id,
      'tenant_id', p_tenant_id,
      'role', p_role,
      'is_active', p_is_active,
      'operation', p_operation,
      'relationship_id', v_relationship_id
    ),
    now()
  );

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'relationship_id', v_relationship_id,
    'operation', v_operation_performed,
    'user_id', p_user_id,
    'tenant_id', p_tenant_id,
    'role', p_role,
    'is_active', p_is_active,
    'message', 'User-tenant relationship ' || v_operation_performed || ' successfully'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error for debugging
    INSERT INTO public.admin_audit_logs (
      admin_id,
      action,
      details,
      created_at
    ) VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
      'user_tenant_relationship_error',
      jsonb_build_object(
        'user_id', p_user_id,
        'tenant_id', p_tenant_id,
        'role', p_role,
        'operation', p_operation,
        'error_message', SQLERRM,
        'error_state', SQLSTATE
      ),
      now()
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM,
      'code', 'DATABASE_ERROR',
      'sql_state', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.manage_user_tenant_relationship TO authenticated;

-- Create helper function to get user tenant relationships
CREATE OR REPLACE FUNCTION public.get_user_tenant_relationships(
  p_user_id uuid DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_include_inactive boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  tenant_id uuid,
  role user_role,
  is_active boolean,
  metadata jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  tenant_name text,
  tenant_slug text,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ut.id,
    ut.user_id,
    ut.tenant_id,
    ut.role,
    ut.is_active,
    ut.metadata,
    ut.created_at,
    ut.updated_at,
    t.name as tenant_name,
    t.slug as tenant_slug,
    au.email as user_email
  FROM public.user_tenants ut
  LEFT JOIN public.tenants t ON t.id = ut.tenant_id
  LEFT JOIN auth.users au ON au.id = ut.user_id
  WHERE 
    (p_user_id IS NULL OR ut.user_id = p_user_id)
    AND (p_tenant_id IS NULL OR ut.tenant_id = p_tenant_id)
    AND (p_include_inactive = true OR ut.is_active = true)
  ORDER BY ut.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenant_relationships TO authenticated;
