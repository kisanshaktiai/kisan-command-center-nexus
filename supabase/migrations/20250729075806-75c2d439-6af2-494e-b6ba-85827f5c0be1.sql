-- Comprehensive Database Cleanup and Reset (Fixed v2)
-- This will remove all dummy data and reset the system to initial state

-- Step 1: Temporarily disable ALL audit triggers and functions
DROP TRIGGER IF EXISTS admin_user_audit_trigger ON admin_users;
DROP TRIGGER IF EXISTS admin_changes_trigger ON admin_users;

-- Step 2: Create temporary audit function that does nothing
CREATE OR REPLACE FUNCTION public.audit_admin_changes_temp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Do nothing during cleanup
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Phase 1: Clear Application Data Tables (in dependency order)

-- Clear analytics and reporting data
DELETE FROM analytics_reports;
DELETE FROM ai_model_metrics;

-- Clear marketplace and product data
DELETE FROM dealer_commissions;
DELETE FROM dealer_communications;
DELETE FROM dealer_documents;
DELETE FROM dealer_performance;
DELETE FROM dealer_territories;
DELETE FROM dealers;

-- Clear farming data
DELETE FROM crop_health_assessments;
DELETE FROM crop_history;
DELETE FROM lands;

-- Clear collaboration data
DELETE FROM collaborative_notes;
DELETE FROM dashboard_updates;
DELETE FROM dashboard_configs;

-- Clear API and integration data
DELETE FROM api_logs;
DELETE FROM api_keys;
DELETE FROM data_migration_jobs;
DELETE FROM data_transformations;

-- Clear billing data
DELETE FROM billing_plans;

-- Clear activation data
DELETE FROM activation_logs;
DELETE FROM activation_codes;

-- Phase 2: Clear User-Related Data
DELETE FROM user_presence;
DELETE FROM user_tenants;
DELETE FROM user_profiles;

-- Clear organization data
DELETE FROM organization_members;

-- Phase 3: Clear Admin and Authentication Data (order matters)
-- Clear audit logs first to avoid FK issues
DELETE FROM admin_audit_logs;
DELETE FROM admin_notifications;
DELETE FROM admin_invite_analytics;
DELETE FROM admin_invites;
DELETE FROM admin_registrations;
DELETE FROM admin_users;
DELETE FROM active_sessions;

-- Clear security events
DELETE FROM security_events;

-- Phase 4: Clear Tenant and System Data
DELETE FROM tenant_detection_events;
DELETE FROM onboarding_steps;
DELETE FROM onboarding_workflows;
DELETE FROM tenant_branding;
DELETE FROM tenant_features;
DELETE FROM tenant_subscriptions;
DELETE FROM tenants;

-- Phase 5: Clear Auth Schema (Supabase managed)
-- Delete all users from auth.users (this will cascade to related tables)
DELETE FROM auth.users;

-- Clear auth sessions and audit logs
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.audit_log_entries;

-- Phase 6: Reset System Configuration
-- Reset bootstrap completion status
UPDATE system_config 
SET config_value = 'false', updated_at = now()
WHERE config_key = 'bootstrap_completed';

-- If no bootstrap config exists, insert it
INSERT INTO system_config (config_key, config_value, created_at, updated_at)
SELECT 'bootstrap_completed', 'false', now(), now()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'bootstrap_completed'
);

-- Step 3: Restore original audit function and triggers
CREATE OR REPLACE FUNCTION public.audit_admin_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_admin_action(
      'admin_user_created',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.full_name,
        'role', NEW.role,
        'is_active', NEW.is_active
      )
    );
    
    -- Send notification to all super admins
    INSERT INTO public.admin_notifications (recipient_id, title, message, type, priority)
    SELECT 
      id,
      'New Admin User Created',
      'A new admin user "' || NEW.full_name || '" (' || NEW.email || ') has been created with role: ' || NEW.role,
      'info',
      'normal'
    FROM public.admin_users 
    WHERE role = 'super_admin' AND is_active = true AND id != auth.uid();
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_admin_action(
      'admin_user_updated',
      NEW.id,
      jsonb_build_object(
        'old_values', jsonb_build_object(
          'email', OLD.email,
          'full_name', OLD.full_name,
          'role', OLD.role,
          'is_active', OLD.is_active
        ),
        'new_values', jsonb_build_object(
          'email', NEW.email,
          'full_name', NEW.full_name,
          'role', NEW.role,
          'is_active', NEW.is_active
        )
      )
    );
    
    -- Send notification for status changes
    IF OLD.is_active != NEW.is_active THEN
      INSERT INTO public.admin_notifications (recipient_id, title, message, type, priority)
      SELECT 
        id,
        'Admin User Status Changed',
        'Admin user "' || NEW.full_name || '" has been ' || CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END,
        CASE WHEN NEW.is_active THEN 'success' ELSE 'warning' END,
        'high'
      FROM public.admin_users 
      WHERE role IN ('super_admin', 'platform_admin') AND is_active = true AND id != auth.uid();
    END IF;
    
    -- Send notification for role changes
    IF OLD.role != NEW.role THEN
      INSERT INTO public.admin_notifications (recipient_id, title, message, type, priority)
      SELECT 
        id,
        'Admin Role Changed',
        'Admin user "' || NEW.full_name || '" role changed from ' || OLD.role || ' to ' || NEW.role,
        'info',
        'high'
      FROM public.admin_users 
      WHERE role = 'super_admin' AND is_active = true AND id != auth.uid();
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_admin_action(
      'admin_user_deleted',
      OLD.id,
      jsonb_build_object(
        'email', OLD.email,
        'full_name', OLD.full_name,
        'role', OLD.role
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Re-create the trigger
CREATE TRIGGER admin_user_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION audit_admin_changes();

-- Drop temporary function
DROP FUNCTION IF EXISTS public.audit_admin_changes_temp();

-- Verification and notification
DO $$
DECLARE
    table_count INTEGER;
    total_records INTEGER := 0;
BEGIN
    -- Count records in key tables to verify cleanup
    SELECT COUNT(*) INTO table_count FROM admin_users;
    total_records := total_records + table_count;
    RAISE NOTICE 'admin_users: % records remaining', table_count;
    
    SELECT COUNT(*) INTO table_count FROM user_profiles;
    total_records := total_records + table_count;
    RAISE NOTICE 'user_profiles: % records remaining', table_count;
    
    SELECT COUNT(*) INTO table_count FROM tenants;
    total_records := total_records + table_count;
    RAISE NOTICE 'tenants: % records remaining', table_count;
    
    SELECT COUNT(*) INTO table_count FROM auth.users;
    total_records := total_records + table_count;
    RAISE NOTICE 'auth.users: % records remaining', table_count;
    
    IF total_records = 0 THEN
        RAISE NOTICE 'SUCCESS: Database cleanup completed - all dummy data removed';
        RAISE NOTICE 'System is now ready for fresh bootstrap process';
    ELSE
        RAISE NOTICE 'WARNING: % total records still remain across key tables', total_records;
    END IF;
    
    -- Check bootstrap status
    SELECT config_value INTO table_count FROM system_config WHERE config_key = 'bootstrap_completed';
    RAISE NOTICE 'Bootstrap status reset to: %', COALESCE(table_count::text, 'false');
END $$;