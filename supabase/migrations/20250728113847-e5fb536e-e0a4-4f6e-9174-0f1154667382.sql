-- Fix email verification for existing super admin users
-- This ensures that super admin users who already exist in admin_users table
-- are properly linked and can access the system

-- First, check if there are any unverified super admin users and verify them
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id IN (
    SELECT au.id 
    FROM admin_users au 
    WHERE au.role = 'super_admin' 
    AND au.is_active = true
)
AND email_confirmed_at IS NULL;

-- Ensure admin_users records are linked properly to auth.users
-- Create a function to verify admin user setup
CREATE OR REPLACE FUNCTION public.verify_admin_user_setup()
RETURNS TABLE (
    user_id uuid,
    email text,
    is_verified boolean,
    admin_role text,
    issues text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email,
        (u.email_confirmed_at IS NOT NULL) as is_verified,
        au.role as admin_role,
        CASE 
            WHEN u.id IS NULL THEN ARRAY['No corresponding auth.users record']
            WHEN u.email_confirmed_at IS NULL THEN ARRAY['Email not verified']
            ELSE ARRAY[]::text[]
        END as issues
    FROM admin_users au
    LEFT JOIN auth.users u ON au.id = u.id
    WHERE au.is_active = true;
END;
$$;

-- Grant permission to authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.verify_admin_user_setup() TO authenticated;

-- Update RLS policy for admin_users to ensure proper access
DROP POLICY IF EXISTS "Enhanced super admin self-access" ON admin_users;
CREATE POLICY "Enhanced super admin self-access" ON admin_users
FOR ALL
TO authenticated
USING (
    id = auth.uid() OR 
    is_current_user_super_admin() OR
    (
        -- Allow access if user is authenticated and this is for viewing their own record
        auth.uid() IS NOT NULL AND id = auth.uid()
    )
)
WITH CHECK (
    id = auth.uid() OR 
    is_current_user_super_admin()
);