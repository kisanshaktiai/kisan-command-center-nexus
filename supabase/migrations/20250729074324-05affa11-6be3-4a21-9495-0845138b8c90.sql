-- Fix the super admin self-registration policy to allow bootstrap with any email
-- when no super admin exists yet

DROP POLICY IF EXISTS "Super admin self-registration" ON public.admin_users;

CREATE POLICY "Bootstrap super admin registration" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (
  -- Allow any user to register as super admin during bootstrap if no super admin exists
  (id = auth.uid()) 
  AND (role = 'super_admin') 
  AND (NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true
  ))
);