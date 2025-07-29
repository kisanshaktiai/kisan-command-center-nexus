-- Step 1: Drop all audit triggers to prevent cascading issues
DROP TRIGGER IF EXISTS audit_admin_user_changes ON public.admin_users;

-- Step 2: Temporarily drop the foreign key constraint
ALTER TABLE public.admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_target_admin_id_fkey;
ALTER TABLE public.admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_admin_id_fkey;

-- Step 3: Clear all audit logs first
DELETE FROM public.admin_audit_logs;

-- Step 4: Disable RLS on admin_users temporarily
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Step 5: Clear admin_users data completely
DELETE FROM public.admin_users;

-- Step 6: Re-enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Step 7: Recreate foreign key constraints
ALTER TABLE public.admin_audit_logs 
ADD CONSTRAINT admin_audit_logs_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.admin_audit_logs 
ADD CONSTRAINT admin_audit_logs_target_admin_id_fkey 
FOREIGN KEY (target_admin_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;

-- Step 8: Recreate the audit trigger
CREATE TRIGGER audit_admin_user_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.audit_admin_user_changes();

-- Step 9: Ensure system_config is properly initialized for bootstrap
DELETE FROM public.system_config WHERE config_key = 'bootstrap_completed';
INSERT INTO public.system_config (config_key, config_value, description, created_at, updated_at)
VALUES ('bootstrap_completed', 'false', 'Indicates if system bootstrap has been completed', now(), now());