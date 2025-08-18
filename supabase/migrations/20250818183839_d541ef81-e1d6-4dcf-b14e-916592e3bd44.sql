
-- Fix user_tenants table schema issues
ALTER TABLE public.user_tenants 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN tenant_id SET NOT NULL;

-- Add foreign key constraints for referential integrity
ALTER TABLE public.user_tenants 
ADD CONSTRAINT fk_user_tenants_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_tenants 
ADD CONSTRAINT fk_user_tenants_tenant_id 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Update RLS policies to be service-role compatible
DROP POLICY IF EXISTS "Service role can manage user tenant relationships" ON public.user_tenants;
DROP POLICY IF EXISTS "Admin users can manage user tenant relationships" ON public.user_tenants;

-- Create comprehensive RLS policies for user_tenants
CREATE POLICY "Service role can manage all user tenant relationships" 
ON public.user_tenants 
FOR ALL 
USING (
  -- Allow service role (used by edge functions)
  current_setting('role') = 'service_role'
  OR 
  -- Allow authenticated users to view their own relationships
  (auth.role() = 'authenticated' AND user_id = auth.uid())
  OR
  -- Allow super admins and platform admins
  (EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND is_active = true 
    AND role IN ('super_admin', 'platform_admin')
  ))
  OR
  -- Allow tenant admins to manage relationships in their tenant
  (EXISTS (
    SELECT 1 FROM public.user_tenants ut 
    WHERE ut.user_id = auth.uid() 
    AND ut.tenant_id = user_tenants.tenant_id
    AND ut.is_active = true 
    AND ut.role IN ('tenant_admin', 'tenant_owner')
  ))
);

-- Ensure the manage_user_tenant_relationship function has proper error handling
CREATE OR REPLACE FUNCTION public.manage_user_tenant_relationship(
  p_user_id uuid, 
  p_tenant_id uuid, 
  p_role user_role, 
  p_is_active boolean DEFAULT true, 
  p_metadata jsonb DEFAULT '{}'::jsonb, 
  p_operation text DEFAULT 'upsert'::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_relationship_id uuid;
  v_existing_record RECORD;
  v_result jsonb;
  v_operation_performed text;
  v_tenant_exists boolean;
  v_user_exists boolean;
BEGIN
  -- Enhanced input validation with better error messages
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User ID cannot be null',
      'code', 'INVALID_USER_ID',
      'details', 'The user_id parameter is required for all operations'
    );
  END IF;

  IF p_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant ID cannot be null',
      'code', 'INVALID_TENANT_ID',
      'details', 'The tenant_id parameter is required for all operations'
    );
  END IF;

  IF p_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Role cannot be null',
      'code', 'INVALID_ROLE',
      'details', 'Valid roles are: super_admin, platform_admin, tenant_admin, tenant_owner, tenant_user, farmer, dealer'
    );
  END IF;

  -- Validate that user exists in auth.users with better error message
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = p_user_id AND deleted_at IS NULL
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User does not exist or has been deleted',
      'code', 'USER_NOT_FOUND',
      'details', 'Cannot create tenant relationship for non-existent user',
      'user_id', p_user_id
    );
  END IF;

  -- Validate that tenant exists with better error message
  SELECT EXISTS(
    SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND deleted_at IS NULL
  ) INTO v_tenant_exists;

  IF NOT v_tenant_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant does not exist or has been deleted',
      'code', 'TENANT_NOT_FOUND',
      'details', 'Cannot create user relationship for non-existent tenant',
      'tenant_id', p_tenant_id
    );
  END IF;

  -- Check for existing relationship
  SELECT * INTO v_existing_record
  FROM public.user_tenants
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

  -- Handle different operations with enhanced error handling
  IF p_operation = 'insert' THEN
    -- Insert only - fail if relationship exists
    IF v_existing_record IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'User-tenant relationship already exists',
        'code', 'RELATIONSHIP_EXISTS',
        'existing_relationship_id', v_existing_record.id,
        'existing_role', v_existing_record.role,
        'details', 'Use update or upsert operation to modify existing relationship'
      );
    END IF;

    -- Insert new relationship with detailed logging
    BEGIN
      INSERT INTO public.user_tenants (
        user_id, tenant_id, role, is_active, metadata, created_at, updated_at
      ) VALUES (
        p_user_id, p_tenant_id, p_role, p_is_active, p_metadata, now(), now()
      ) RETURNING id INTO v_relationship_id;

      v_operation_performed := 'created';
    EXCEPTION 
      WHEN foreign_key_violation THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Foreign key constraint violation',
          'code', 'FK_VIOLATION',
          'details', 'Either user_id or tenant_id references a non-existent record',
          'user_id', p_user_id,
          'tenant_id', p_tenant_id
        );
      WHEN check_violation THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid role value',
          'code', 'INVALID_ROLE_VALUE',
          'details', 'Role must be one of the valid enum values',
          'provided_role', p_role
        );
      WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Database insertion failed: ' || SQLERRM,
          'code', 'INSERT_FAILED',
          'sql_state', SQLSTATE,
          'details', 'Unexpected error during user_tenants insertion'
        );
    END;

  ELSIF p_operation = 'update' THEN
    -- Update only - fail if relationship doesn't exist
    IF v_existing_record IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'User-tenant relationship does not exist',
        'code', 'RELATIONSHIP_NOT_FOUND',
        'details', 'Cannot update non-existent relationship. Use insert or upsert operation.',
        'user_id', p_user_id,
        'tenant_id', p_tenant_id
      );
    END IF;

    -- Update existing relationship
    BEGIN
      UPDATE public.user_tenants
      SET 
        role = p_role,
        is_active = p_is_active,
        metadata = p_metadata,
        updated_at = now()
      WHERE user_id = p_user_id AND tenant_id = p_tenant_id
      RETURNING id INTO v_relationship_id;

      v_operation_performed := 'updated';
    EXCEPTION 
      WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Database update failed: ' || SQLERRM,
          'code', 'UPDATE_FAILED',
          'sql_state', SQLSTATE
        );
    END;

  ELSE -- 'upsert' (default)
    -- Upsert - insert if not exists, update if exists
    IF v_existing_record IS NOT NULL THEN
      -- Update existing relationship
      BEGIN
        UPDATE public.user_tenants
        SET 
          role = p_role,
          is_active = p_is_active,
          metadata = COALESCE(p_metadata, metadata),
          updated_at = now()
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id
        RETURNING id INTO v_relationship_id;

        v_operation_performed := 'updated';
      EXCEPTION 
        WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Database update failed: ' || SQLERRM,
            'code', 'UPSERT_UPDATE_FAILED',
            'sql_state', SQLSTATE
          );
      END;
    ELSE
      -- Insert new relationship
      BEGIN
        INSERT INTO public.user_tenants (
          user_id, tenant_id, role, is_active, metadata, created_at, updated_at
        ) VALUES (
          p_user_id, p_tenant_id, p_role, p_is_active, p_metadata, now(), now()
        ) RETURNING id INTO v_relationship_id;

        v_operation_performed := 'created';
      EXCEPTION 
        WHEN foreign_key_violation THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Foreign key constraint violation during upsert',
            'code', 'UPSERT_FK_VIOLATION',
            'details', 'Either user_id or tenant_id references a non-existent record'
          );
        WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Database insertion failed: ' || SQLERRM,
            'code', 'UPSERT_INSERT_FAILED',
            'sql_state', SQLSTATE
          );
      END;
    END IF;
  END IF;

  -- Log the operation for audit trail with enhanced details
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
      'relationship_id', v_relationship_id,
      'metadata', p_metadata
    ),
    now()
  );

  -- Build success response with comprehensive details
  v_result := jsonb_build_object(
    'success', true,
    'relationship_id', v_relationship_id,
    'operation', v_operation_performed,
    'user_id', p_user_id,
    'tenant_id', p_tenant_id,
    'role', p_role,
    'is_active', p_is_active,
    'message', 'User-tenant relationship ' || v_operation_performed || ' successfully',
    'timestamp', now()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error for debugging with enhanced details
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
        'error_state', SQLSTATE,
        'error_detail', SQLERRM,
        'context', 'Unexpected error in manage_user_tenant_relationship function'
      ),
      now()
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unexpected database error: ' || SQLERRM,
      'code', 'UNEXPECTED_ERROR',
      'sql_state', SQLSTATE,
      'details', 'An unexpected error occurred while managing user-tenant relationship'
    );
END;
$function$;
