
-- Create comprehensive data purge function for performance testing
CREATE OR REPLACE FUNCTION public.purge_app_data(p_scope text DEFAULT 'all')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  truncated_tables text[] := '{}';
  result jsonb;
BEGIN
  -- Only allow super admins to run this function
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Log the purge operation
  INSERT INTO public.admin_audit_logs (
    admin_id, action, details
  ) VALUES (
    auth.uid(), 
    'data_purge_initiated', 
    jsonb_build_object('scope', p_scope, 'timestamp', now())
  );

  -- Purge based on scope
  IF p_scope IN ('all', 'tenants') THEN
    -- Tenant-related tables (order matters due to foreign keys)
    TRUNCATE TABLE public.tenant_detection_events RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'tenant_detection_events');
    
    TRUNCATE TABLE public.tenant_archive_jobs RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'tenant_archive_jobs');
    
    TRUNCATE TABLE public.tenant_branding RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'tenant_branding');
    
    TRUNCATE TABLE public.tenant_features RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'tenant_features');
    
    TRUNCATE TABLE public.tenant_creation_requests RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'tenant_creation_requests');
    
    TRUNCATE TABLE public.user_tenants RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'user_tenants');
    
    TRUNCATE TABLE public.onboarding_steps RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'onboarding_steps');
    
    TRUNCATE TABLE public.onboarding_workflows RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'onboarding_workflows');
    
    TRUNCATE TABLE public.team_invitations RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'team_invitations');
    
    TRUNCATE TABLE public.tenants RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'tenants');
  END IF;

  IF p_scope IN ('all', 'leads') THEN
    -- Lead-related tables (order matters due to foreign keys)
    TRUNCATE TABLE public.lead_activities RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'lead_activities');
    
    TRUNCATE TABLE public.lead_assignments RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'lead_assignments');
    
    TRUNCATE TABLE public.lead_communications RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'lead_communications');
    
    TRUNCATE TABLE public.lead_tags RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'lead_tags');
    
    TRUNCATE TABLE public.lead_scoring_rules RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'lead_scoring_rules');
    
    TRUNCATE TABLE public.leads RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'leads');
  END IF;

  IF p_scope = 'all' THEN
    -- Additional cleanup for comprehensive purge
    TRUNCATE TABLE public.user_invitations RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'user_invitations');
    
    TRUNCATE TABLE public.admin_invites RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'admin_invites');
    
    TRUNCATE TABLE public.admin_registrations RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'admin_registrations');
    
    TRUNCATE TABLE public.admin_registration_tokens RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'admin_registration_tokens');
    
    -- Keep admin audit logs for accountability, but truncate other audit tables
    TRUNCATE TABLE public.email_events RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'email_events');
    
    TRUNCATE TABLE public.rate_limits RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'rate_limits');
    
    TRUNCATE TABLE public.dashboard_updates RESTART IDENTITY CASCADE;
    truncated_tables := array_append(truncated_tables, 'dashboard_updates');
  END IF;

  result := jsonb_build_object(
    'success', true,
    'scope', p_scope,
    'truncated_tables', truncated_tables,
    'total_tables_truncated', array_length(truncated_tables, 1),
    'executed_at', now(),
    'executed_by', auth.uid()
  );

  -- Log successful completion
  INSERT INTO public.admin_audit_logs (
    admin_id, action, details
  ) VALUES (
    auth.uid(), 
    'data_purge_completed', 
    result
  );

  RETURN result;
END;
$$;

-- Execute the comprehensive purge to clean all data
SELECT public.purge_app_data('all');

-- Verify tables are empty
SELECT 
  'tenants' as table_name, 
  COUNT(*) as row_count 
FROM public.tenants
UNION ALL
SELECT 
  'leads' as table_name, 
  COUNT(*) as row_count 
FROM public.leads
UNION ALL
SELECT 
  'onboarding_workflows' as table_name, 
  COUNT(*) as row_count 
FROM public.onboarding_workflows
UNION ALL
SELECT 
  'lead_activities' as table_name, 
  COUNT(*) as row_count 
FROM public.lead_activities
UNION ALL
SELECT 
  'tenant_branding' as table_name, 
  COUNT(*) as row_count 
FROM public.tenant_branding;
