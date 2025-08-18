
-- Create a security definer function to safely get current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Update the RLS policy that was causing the permission error
DROP POLICY IF EXISTS "Users can update their own registration" ON public.admin_registrations;
DROP POLICY IF EXISTS "Users can view their own registration" ON public.admin_registrations;

-- Recreate the policies using the security definer function
CREATE POLICY "Users can update their own registration" 
ON public.admin_registrations 
FOR UPDATE 
USING (
  email = public.get_current_user_email() 
  AND status = 'pending'
)
WITH CHECK (
  email = public.get_current_user_email() 
  AND status = ANY(ARRAY['completed', 'pending'])
);

CREATE POLICY "Users can view their own registration" 
ON public.admin_registrations 
FOR SELECT 
USING (
  email = public.get_current_user_email()
);
