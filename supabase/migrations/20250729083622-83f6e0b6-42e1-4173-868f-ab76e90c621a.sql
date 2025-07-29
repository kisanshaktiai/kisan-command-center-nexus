-- Step 1: Drop all audit triggers to prevent cascading issues
DROP TRIGGER IF EXISTS audit_admin_user_changes ON public.admin_users;
DROP TRIGGER IF EXISTS audit_admin_changes ON public.admin_users;

-- Step 2: Disable RLS on admin_users temporarily
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Step 3: Clear admin_users and all dependent tables with CASCADE
TRUNCATE public.admin_users CASCADE;

-- Step 4: Re-enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Step 5: Recreate the audit trigger
CREATE TRIGGER audit_admin_user_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.audit_admin_user_changes();

-- Step 6: Ensure system_config is properly initialized for bootstrap
DELETE FROM public.system_config WHERE config_key = 'bootstrap_completed';
INSERT INTO public.system_config (config_key, config_value, description, created_at, updated_at)
VALUES ('bootstrap_completed', 'false', 'Indicates if system bootstrap has been completed', now(), now());

-- Step 7: Verify cleanup
SELECT 
    'admin_users' as table_name, 
    COUNT(*) as record_count 
FROM public.admin_users
UNION ALL
SELECT 
    'admin_audit_logs' as table_name, 
    COUNT(*) as record_count 
FROM public.admin_audit_logs
UNION ALL
SELECT 
    'admin_notifications' as table_name, 
    COUNT(*) as record_count 
FROM public.admin_notifications
UNION ALL
SELECT 
    'system_config' as table_name, 
    COUNT(*) as record_count 
FROM public.system_config;