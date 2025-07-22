
-- Function to add the current authenticated user to admin_users table with super_admin role
-- This can be called when a user is authenticated and needs to be promoted
CREATE OR REPLACE FUNCTION public.add_current_user_as_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Add the current authenticated user to admin_users table with super_admin role
    INSERT INTO public.admin_users (
        id,
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    )
    SELECT 
        auth.uid(),
        (auth.jwt() ->> 'email'),
        COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'full_name', 'Super Admin'),
        'super_admin',
        true,
        now(),
        now()
    WHERE auth.uid() IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
        role = 'super_admin',
        is_active = true,
        updated_at = now();

    -- Also insert by email if we can't get the auth.uid() (fallback)
    INSERT INTO public.admin_users (
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    )
    SELECT 
        (auth.jwt() ->> 'email'),
        COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'full_name', 'Super Admin'),
        'super_admin',
        true,
        now(),
        now()
    WHERE (auth.jwt() ->> 'email') IS NOT NULL
    ON CONFLICT (email) DO UPDATE SET
        role = 'super_admin',
        is_active = true,
        updated_at = now();
        
    RETURN TRUE;
END;
$$;

-- Note: To use this function, call it when authenticated:
-- SELECT public.add_current_user_as_super_admin();
