
-- Create the super admin user directly in the auth.users table and related tables
-- This will bypass the pending request system entirely

-- First, let's clean up any existing pending requests (without hardcoded email)
-- DELETE FROM public.pending_admin_requests WHERE email = 'example@domain.com';

-- Create the user in auth.users table (this is the proper way to create admin users)
-- Note: We'll use Supabase's admin API through an edge function to create this properly
-- For now, let's prepare the admin user record in our super_admin schema

-- The super admin user should be created manually or through the admin interface
-- No hardcoded email insertions in migrations
