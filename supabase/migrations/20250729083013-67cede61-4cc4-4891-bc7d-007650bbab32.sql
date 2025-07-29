-- Step 1: Disable RLS temporarily on admin_users to allow cleanup
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Step 2: Clear admin_users data completely
DELETE FROM public.admin_users;

-- Step 3: Re-enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Step 4: Ensure system_config is properly initialized for bootstrap
DELETE FROM public.system_config WHERE config_key = 'bootstrap_completed';
INSERT INTO public.system_config (config_key, config_value, description, created_at, updated_at)
VALUES ('bootstrap_completed', 'false', 'Indicates if system bootstrap has been completed', now(), now());

-- Step 5: Verify cleanup by checking table counts
-- This will be reflected in the query results