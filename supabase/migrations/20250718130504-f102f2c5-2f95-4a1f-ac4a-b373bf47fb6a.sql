
-- Add the current authenticated user to admin_users table with super_admin role
-- This assumes you're currently logged in and your user ID will be used
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
