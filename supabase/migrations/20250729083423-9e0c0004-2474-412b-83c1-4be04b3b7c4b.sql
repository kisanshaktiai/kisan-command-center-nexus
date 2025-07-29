-- Step 1: Temporarily drop the audit trigger to avoid foreign key conflicts
DROP TRIGGER IF EXISTS audit_admin_user_changes ON public.admin_users;

-- Step 2: Disable RLS temporarily on admin_users to allow cleanup
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Step 3: Clear admin_users data completely
DELETE FROM public.admin_users;

-- Step 4: Re-enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Step 5: Recreate the audit trigger
CREATE TRIGGER audit_admin_user_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.audit_admin_changes();

-- Step 6: Clear any orphaned audit logs
DELETE FROM public.admin_audit_logs;

-- Step 7: Ensure system_config is properly initialized for bootstrap
DELETE FROM public.system_config WHERE config_key = 'bootstrap_completed';
INSERT INTO public.system_config (config_key, config_value, description, created_at, updated_at)
VALUES ('bootstrap_completed', 'false', 'Indicates if system bootstrap has been completed', now(), now());