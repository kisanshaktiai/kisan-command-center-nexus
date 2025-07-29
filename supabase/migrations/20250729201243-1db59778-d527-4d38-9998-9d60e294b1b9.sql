-- Enable RLS on any tables that don't have it enabled in public schema
-- This addresses the critical security issue

-- Check if there are any tables without RLS in public schema and enable it
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN (
            SELECT tablename 
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE c.relrowsecurity = true
            AND t.schemaname = 'public'
        )
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', rec.tablename);
        
        -- Add a default policy that blocks access for security
        EXECUTE format('CREATE POLICY "Block all access by default" ON public.%I FOR ALL USING (false);', rec.tablename);
        
        RAISE NOTICE 'Enabled RLS and added blocking policy for table: %', rec.tablename;
    END LOOP;
END $$;