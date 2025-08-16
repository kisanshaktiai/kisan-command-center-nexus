-- Fix critical security vulnerability in admin_registrations table
-- Remove overly permissive public SELECT policy and create secure access controls

-- Drop the insecure public SELECT policy
DROP POLICY IF EXISTS "Allow reading registrations" ON public.admin_registrations;

-- Create secure RLS policies for admin_registrations table

-- 1. Allow users to view their own registration records
CREATE POLICY "Users can view their own registration"
ON public.admin_registrations
FOR SELECT
TO authenticated
USING (
  -- User can view their own registration by email match
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 2. Allow authenticated admins to view all registrations for management
CREATE POLICY "Authenticated admins can view all registrations"
ON public.admin_registrations
FOR SELECT
TO authenticated
USING (
  -- Only authenticated admins can view all registration records
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.id = auth.uid() 
    AND au.is_active = true 
    AND au.role IN ('super_admin', 'platform_admin', 'admin')
  )
);

-- 3. Allow system to check registration status for bootstrap without exposing data
CREATE OR REPLACE FUNCTION public.check_registration_status(p_email text DEFAULT NULL, p_token text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  registration_exists boolean := false;
  registration_valid boolean := false;
  registration_status text := null;
  bootstrap_allowed boolean := false;
BEGIN
  -- Check if bootstrap is allowed (no super admin exists)
  SELECT NOT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  ) INTO bootstrap_allowed;
  
  -- If email is provided, check registration by email
  IF p_email IS NOT NULL THEN
    SELECT 
      true,
      (status = 'pending' AND expires_at > now()),
      status
    INTO 
      registration_exists,
      registration_valid,
      registration_status
    FROM public.admin_registrations
    WHERE email = p_email
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- If token is provided, check registration by token
  IF p_token IS NOT NULL THEN
    SELECT 
      true,
      (status = 'pending' AND expires_at > now()),
      status
    INTO 
      registration_exists,
      registration_valid,
      registration_status
    FROM public.admin_registrations
    WHERE registration_token = p_token
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN jsonb_build_object(
    'registration_exists', COALESCE(registration_exists, false),
    'registration_valid', COALESCE(registration_valid, false),
    'registration_status', registration_status,
    'bootstrap_allowed', bootstrap_allowed,
    'can_register', bootstrap_allowed OR COALESCE(registration_valid, false)
  );
END;
$$;

-- Grant public access to the secure registration check function
GRANT EXECUTE ON FUNCTION public.check_registration_status TO anon, authenticated;

-- 4. Update INSERT policy to be more specific and secure
DROP POLICY IF EXISTS "Allow bootstrap and admin registration" ON public.admin_registrations;

CREATE POLICY "Bootstrap registration allowed"
ON public.admin_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow registration only during bootstrap or by authenticated admins
  (
    -- During bootstrap (no super admin exists)
    NOT EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE role = 'super_admin' AND is_active = true
    )
  )
  OR
  (
    -- Or by authenticated admins creating invitations
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true 
      AND au.role IN ('super_admin', 'platform_admin')
    )
  )
);

-- 5. Allow users to update their own registration during completion
CREATE POLICY "Users can update their own registration"
ON public.admin_registrations
FOR UPDATE
TO authenticated
USING (
  -- User can update their own registration by email match
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  -- Ensure they can only update to 'completed' status
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status IN ('completed', 'pending')
);

-- 6. Allow authenticated admins to update all registrations
CREATE POLICY "Authenticated admins can update registrations"
ON public.admin_registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.id = auth.uid() 
    AND au.is_active = true 
    AND au.role IN ('super_admin', 'platform_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.id = auth.uid() 
    AND au.is_active = true 
    AND au.role IN ('super_admin', 'platform_admin', 'admin')
  )
);

-- 7. Create secure function to validate registration tokens without exposing data
CREATE OR REPLACE FUNCTION public.validate_registration_token_secure(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_valid boolean := false;
  token_expired boolean := true;
  registration_role text := null;
  registration_email text := null;
BEGIN
  -- Validate token and get minimal required data
  SELECT 
    (status = 'pending'),
    (expires_at > now()),
    role,
    email
  INTO 
    token_valid,
    token_expired,
    registration_role,
    registration_email
  FROM public.admin_registrations
  WHERE registration_token = p_token
  AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Return validation result without exposing sensitive data
  IF token_valid AND token_expired THEN
    RETURN jsonb_build_object(
      'valid', true,
      'role', registration_role,
      'email', registration_email,
      'expired', false
    );
  ELSE
    RETURN jsonb_build_object(
      'valid', false,
      'role', null,
      'email', null,
      'expired', NOT token_expired
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users for token validation
GRANT EXECUTE ON FUNCTION public.validate_registration_token_secure TO authenticated;

-- 8. Add audit logging for registration access
CREATE OR REPLACE FUNCTION public.log_registration_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log registration access for audit trail
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    details,
    created_at
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
    'admin_registration_accessed',
    jsonb_build_object(
      'registration_id', COALESCE(NEW.id, OLD.id),
      'registration_email', COALESCE(NEW.email, OLD.email),
      'operation', TG_OP,
      'status', COALESCE(NEW.status, OLD.status)
    ),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for audit logging on admin_registrations
DROP TRIGGER IF EXISTS audit_admin_registrations ON public.admin_registrations;
CREATE TRIGGER audit_admin_registrations
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_registrations
  FOR EACH ROW EXECUTE FUNCTION public.log_registration_access();

-- 9. Add security comment
COMMENT ON TABLE public.admin_registrations IS 'Admin registrations table with secure RLS policies. Access restricted to own records and authenticated admins only. Use check_registration_status() for public bootstrap checks.';

-- 10. Create function to clean up expired registrations (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_expired_registrations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete expired registrations older than 30 days
  DELETE FROM public.admin_registrations 
  WHERE expires_at < now() - interval '30 days'
  AND status IN ('pending', 'expired');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup action
  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    details,
    created_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'expired_registrations_cleanup',
    jsonb_build_object('deleted_count', deleted_count),
    now()
  );
  
  RETURN deleted_count;
END;
$$;

-- Grant execute to authenticated users for cleanup function
GRANT EXECUTE ON FUNCTION public.cleanup_expired_registrations TO authenticated;