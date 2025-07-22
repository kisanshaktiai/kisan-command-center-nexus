
-- First, let's check if the admin user exists and create/update it
INSERT INTO public.admin_users (
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    'kisanshaktiai@gmail.com',
    'Amarsinh Patil',
    'super_admin',
    true,
    now(),
    now()
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'super_admin',
    is_active = true,
    updated_at = now();

-- Also ensure any user who signs up with this email gets admin privileges
-- This is a fallback insertion for any authenticated user with this email
DO $$
BEGIN
    -- Check if there's an authenticated user with this email and add them to admin_users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'kisanshaktiai@gmail.com') THEN
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
            id,
            email,
            COALESCE(raw_user_meta_data->>'full_name', 'Super Admin'),
            'super_admin',
            true,
            now(),
            now()
        FROM auth.users 
        WHERE email = 'kisanshaktiai@gmail.com'
        ON CONFLICT (email) DO UPDATE SET
            role = 'super_admin',
            is_active = true,
            updated_at = now();
    END IF;
END $$;
