
-- Admin user creation should be done through the application interface
-- No hardcoded emails in migrations

-- Function to promote any authenticated user to super admin (for future use)
-- This can be called with any email as needed
CREATE OR REPLACE FUNCTION public.promote_user_to_super_admin(user_email TEXT, admin_name TEXT DEFAULT 'Super Admin')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update admin user record
    INSERT INTO public.admin_users (
        email,
        full_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        user_email,
        admin_name,
        'super_admin',
        true,
        now(),
        now()
    ) ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'super_admin',
        is_active = true,
        updated_at = now();

    -- Check if there's an authenticated user with this email and update their metadata
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        UPDATE auth.users 
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
            'role', 'super_admin',
            'full_name', admin_name
        )
        WHERE email = user_email;
        
        UPDATE auth.users 
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
            'role', 'super_admin'
        )
        WHERE email = user_email;
    END IF;
    
    RETURN TRUE;
END;
$$;
