-- Step 1: Get all foreign key constraints for admin_audit_logs and drop them
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Drop all foreign key constraints on admin_audit_logs
    FOR constraint_rec IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'admin_audit_logs' 
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE public.admin_audit_logs DROP CONSTRAINT IF EXISTS ' || constraint_rec.constraint_name;
    END LOOP;
END $$;

-- Step 2: Drop all audit triggers to prevent cascading issues
DROP TRIGGER IF EXISTS audit_admin_user_changes ON public.admin_users;
DROP TRIGGER IF EXISTS audit_admin_changes ON public.admin_users;

-- Step 3: Clear all audit logs first (no constraints now)
TRUNCATE public.admin_audit_logs;

-- Step 4: Disable RLS on admin_users temporarily
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Step 5: Clear admin_users data completely
TRUNCATE public.admin_users;

-- Step 6: Re-enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Step 7: Recreate foreign key constraints with CASCADE DELETE
ALTER TABLE public.admin_audit_logs 
ADD CONSTRAINT admin_audit_logs_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;

ALTER TABLE public.admin_audit_logs 
ADD CONSTRAINT admin_audit_logs_target_admin_id_fkey 
FOREIGN KEY (target_admin_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;

-- Step 8: Recreate the audit trigger
CREATE TRIGGER audit_admin_user_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.audit_admin_user_changes();

-- Step 9: Ensure system_config is properly initialized for bootstrap
DELETE FROM public.system_config WHERE config_key = 'bootstrap_completed';
INSERT INTO public.system_config (config_key, config_value, description, created_at, updated_at)
VALUES ('bootstrap_completed', 'false', 'Indicates if system bootstrap has been completed', now(), now());