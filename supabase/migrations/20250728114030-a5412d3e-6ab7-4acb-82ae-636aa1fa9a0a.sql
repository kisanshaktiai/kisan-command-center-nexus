-- Enable RLS on spatial_ref_sys table (PostGIS system table)
-- This is safe as it's a read-only reference table for spatial data
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for spatial_ref_sys as it contains reference data
CREATE POLICY IF NOT EXISTS "Allow public read access to spatial reference systems"
ON public.spatial_ref_sys FOR SELECT
TO public
USING (true);

-- Fix the search path security issue for the verify_admin_user_setup function
DROP FUNCTION IF EXISTS public.verify_admin_user_setup();
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
SET search_path = ''
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
    FROM public.admin_users au
    LEFT JOIN auth.users u ON au.id = u.id
    WHERE au.is_active = true;
END;
$$;