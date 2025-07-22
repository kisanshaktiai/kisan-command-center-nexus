
-- Create the super admin user directly in the auth.users table and related tables
-- This will bypass the pending request system entirely

-- First, let's clean up any existing pending requests for this email
DELETE FROM public.pending_admin_requests WHERE email = 'kisanshaktiai@gmail.com';

-- Create the user in auth.users table (this is the proper way to create admin users)
-- Note: We'll use Supabase's admin API through an edge function to create this properly
-- For now, let's prepare the admin user record in our super_admin schema

-- Insert into super_admin.admin_users table
INSERT INTO super_admin.admin_users (
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
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = now();
