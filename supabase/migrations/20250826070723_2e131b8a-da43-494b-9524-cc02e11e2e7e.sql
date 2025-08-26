
-- First, let's check if there are proper RLS policies for user_tenants table
-- and ensure the manage-user-tenant function can work properly

-- Update the RLS policy for user_tenants to allow proper management
DROP POLICY IF EXISTS "Admin users can manage user tenants" ON public.user_tenants;

CREATE POLICY "Admin users can manage user tenants" 
ON public.user_tenants 
FOR ALL 
USING (
  -- Allow super admins and platform admins to manage all
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = auth.uid() 
    AND au.is_active = true 
    AND au.role IN ('super_admin', 'platform_admin')
  )
  OR 
  -- Allow tenant admins to manage their own tenant relationships
  EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = user_tenants.tenant_id
    AND ut.is_active = true
    AND ut.role IN ('tenant_admin', 'tenant_owner')
  )
);

-- Also ensure the audit logs can handle cases where admin_id might be null or invalid
-- Update the foreign key constraint to allow null admin_id for system operations
ALTER TABLE public.admin_audit_logs 
DROP CONSTRAINT IF EXISTS admin_audit_logs_admin_id_fkey;

ALTER TABLE public.admin_audit_logs 
ADD CONSTRAINT admin_audit_logs_admin_id_fkey 
FOREIGN KEY (admin_id) 
REFERENCES public.admin_users(id) 
ON DELETE SET NULL;

-- Create a function to safely manage user-tenant relationships without requiring admin_users record
CREATE OR REPLACE FUNCTION public.manage_user_tenant_relationship(
  p_user_id UUID,
  p_tenant_id UUID,
  p_role TEXT DEFAULT 'tenant_admin',
  p_is_active BOOLEAN DEFAULT true,
  p_metadata JSONB DEFAULT '{}',
  p_operation TEXT DEFAULT 'upsert'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_relationship_id UUID;
  v_existing_record RECORD;
  v_result JSONB;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User ID and Tenant ID are required',
      'code', 'VALIDATION_ERROR'
    );
  END IF;

  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in authentication system',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant not found',
      'code', 'TENANT_NOT_FOUND'
    );
  END IF;

  -- Get existing record
  SELECT * INTO v_existing_record
  FROM public.user_tenants
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;

  IF p_operation = 'insert' AND v_existing_record IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User-tenant relationship already exists',
      'code', 'ALREADY_EXISTS'
    );
  END IF;

  IF p_operation = 'update' AND v_existing_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User-tenant relationship does not exist',
      'code', 'NOT_FOUND'
    );
  END IF;

  -- Perform the operation
  IF v_existing_record IS NULL THEN
    -- Insert new record
    INSERT INTO public.user_tenants (
      id,
      user_id,
      tenant_id,
      role,
      is_active,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      p_tenant_id,
      p_role::user_role,
      p_is_active,
      p_metadata,
      now(),
      now()
    ) RETURNING id INTO v_relationship_id;

    v_result := jsonb_build_object(
      'success', true,
      'message', 'User-tenant relationship created successfully',
      'operation', 'insert',
      'relationship_id', v_relationship_id,
      'user_id', p_user_id,
      'tenant_id', p_tenant_id,
      'role', p_role,
      'is_active', p_is_active
    );
  ELSE
    -- Update existing record
    UPDATE public.user_tenants
    SET
      role = p_role::user_role,
      is_active = p_is_active,
      metadata = p_metadata,
      updated_at = now()
    WHERE user_id = p_user_id AND tenant_id = p_tenant_id
    RETURNING id INTO v_relationship_id;

    v_result := jsonb_build_object(
      'success', true,
      'message', 'User-tenant relationship updated successfully',
      'operation', 'update',
      'relationship_id', v_relationship_id,
      'user_id', p_user_id,
      'tenant_id', p_tenant_id,
      'role', p_role,
      'is_active', p_is_active
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.manage_user_tenant_relationship TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_user_tenant_relationship TO anon;
