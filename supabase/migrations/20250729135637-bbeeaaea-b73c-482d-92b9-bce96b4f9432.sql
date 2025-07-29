-- Remove hardcoded email restrictions and clean up authentication

-- 1. Remove hardcoded email policies
DROP POLICY IF EXISTS "Self-registration for super admin email" ON public.admin_users;
DROP POLICY IF EXISTS "Super admin self-registration" ON public.admin_users;

-- 2. Create flexible bootstrap policy that allows first super admin creation
CREATE POLICY "Bootstrap super admin creation"
ON public.admin_users
FOR INSERT
WITH CHECK (
  role = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  )
  AND auth.uid() = id
);

-- 3. Clean up any hardcoded email references
DELETE FROM public.admin_users WHERE email = 'kisanshaktiai@gmail.com' AND NOT EXISTS (
  SELECT 1 FROM auth.users WHERE auth.users.id = admin_users.id
);

-- 4. Update system config to be flexible
UPDATE public.system_config 
SET config_value = 'false' 
WHERE config_key = 'bootstrap_completed';

-- 5. Create a flexible admin invitation system
CREATE OR REPLACE FUNCTION public.can_create_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow if user is super admin or if no super admin exists (bootstrap)
  RETURN (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    )
    OR 
    NOT EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE role = 'super_admin' 
      AND is_active = true
    )
  );
END;
$$;

-- 6. Update admin_users policies to use the new function
DROP POLICY IF EXISTS "Enhanced super admin self-access" ON public.admin_users;
CREATE POLICY "Admin management access"
ON public.admin_users
FOR ALL
USING (
  id = auth.uid() 
  OR public.can_create_admin()
)
WITH CHECK (
  id = auth.uid() 
  OR public.can_create_admin()
);