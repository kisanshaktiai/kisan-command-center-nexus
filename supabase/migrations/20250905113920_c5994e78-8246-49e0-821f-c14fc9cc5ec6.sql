-- Fix critical RLS issues for security
-- Enable RLS on tables that are missing it

-- Enable RLS on tenant_archive_jobs table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_archive_jobs') THEN
    ALTER TABLE public.tenant_archive_jobs ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for super admins only
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'tenant_archive_jobs' 
      AND policyname = 'Only super admins can view archive jobs'
    ) THEN
      CREATE POLICY "Only super admins can view archive jobs" 
      ON public.tenant_archive_jobs 
      FOR SELECT 
      USING (EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
      ));
    END IF;
  END IF;
END $$;

-- Enable RLS on team_invitations table  
ALTER TABLE IF EXISTS public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team_invitations using correct column name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_invitations' 
    AND policyname = 'Users can view invitations for their tenants'
  ) THEN
    CREATE POLICY "Users can view invitations for their tenants" 
    ON public.team_invitations 
    FOR SELECT 
    USING (tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_invitations' 
    AND policyname = 'Users can manage invitations they created'
  ) THEN
    CREATE POLICY "Users can manage invitations they created" 
    ON public.team_invitations 
    FOR ALL 
    USING (invited_by = auth.uid());
  END IF;
END $$;