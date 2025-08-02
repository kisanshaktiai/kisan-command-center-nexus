
-- Update the auto_assign_lead function to ensure leads are always assigned to super admins
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  admin_id uuid;
  rule_record RECORD;
  super_admins uuid[];
  assignment_count integer;
  selected_admin uuid;
BEGIN
  -- First, try to find active assignment rules
  SELECT * INTO rule_record
  FROM public.lead_assignment_rules
  WHERE is_active = true
  ORDER BY priority_order ASC, created_at ASC
  LIMIT 1;

  IF rule_record IS NOT NULL AND array_length(rule_record.admin_pool, 1) > 0 THEN
    -- Use existing assignment rule logic
    SELECT rule_record.admin_pool[
      (COALESCE((SELECT COUNT(*) FROM public.lead_assignments WHERE assigned_at::date = CURRENT_DATE), 0) % array_length(rule_record.admin_pool, 1)) + 1
    ] INTO admin_id;

    -- Update the lead with assignment
    NEW.assigned_to = admin_id;
    NEW.assigned_at = now();
    NEW.status = 'assigned';

    -- Log the assignment
    INSERT INTO public.lead_assignments (lead_id, assigned_to, assignment_type, assignment_reason)
    VALUES (NEW.id, admin_id, 'auto', 'Auto-assigned via rule: ' || rule_record.rule_name);

    RETURN NEW;
  END IF;

  -- Fallback: Assign to super admins using round-robin
  SELECT array_agg(id) INTO super_admins
  FROM public.admin_users
  WHERE role = 'super_admin' AND is_active = true;

  IF super_admins IS NOT NULL AND array_length(super_admins, 1) > 0 THEN
    -- Get assignment count for today to implement round-robin
    SELECT COALESCE(COUNT(*), 0) INTO assignment_count
    FROM public.lead_assignments
    WHERE assigned_at::date = CURRENT_DATE;

    -- Select admin using round-robin
    selected_admin := super_admins[(assignment_count % array_length(super_admins, 1)) + 1];

    -- Update the lead with assignment
    NEW.assigned_to = selected_admin;
    NEW.assigned_at = now();
    NEW.status = 'assigned';

    -- Log the assignment
    INSERT INTO public.lead_assignments (lead_id, assigned_to, assignment_type, assignment_reason)
    VALUES (NEW.id, selected_admin, 'auto', 'Auto-assigned to super admin (fallback)');

    RETURN NEW;
  ELSE
    -- No super admins available - log error but don't fail
    INSERT INTO public.lead_assignments (lead_id, assigned_to, assignment_type, assignment_reason)
    VALUES (NEW.id, NULL, 'failed', 'No super admins available for assignment');
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS auto_assign_new_leads ON public.leads;

CREATE TRIGGER auto_assign_new_leads
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_lead();

-- Create a default assignment rule for super admins if none exists
DO $$
DECLARE
  super_admin_ids uuid[];
  rule_exists boolean;
BEGIN
  -- Check if any assignment rules exist
  SELECT EXISTS(SELECT 1 FROM public.lead_assignment_rules WHERE is_active = true) INTO rule_exists;
  
  -- Only create default rule if no active rules exist
  IF NOT rule_exists THEN
    -- Get all active super admin IDs
    SELECT array_agg(id) INTO super_admin_ids
    FROM public.admin_users
    WHERE role = 'super_admin' AND is_active = true;
    
    -- Create default rule if super admins exist
    IF super_admin_ids IS NOT NULL AND array_length(super_admin_ids, 1) > 0 THEN
      INSERT INTO public.lead_assignment_rules (
        rule_name,
        rule_type,
        admin_pool,
        is_active,
        priority_order,
        conditions,
        created_at,
        updated_at
      ) VALUES (
        'Default Super Admin Assignment',
        'round_robin',
        super_admin_ids,
        true,
        1,
        '{"description": "Default rule to assign leads to super admins"}',
        now(),
        now()
      );
    END IF;
  END IF;
END $$;

-- Create a function to test the auto-assignment
CREATE OR REPLACE FUNCTION public.test_lead_auto_assignment()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  test_lead_id uuid;
  assignment_result jsonb;
  super_admin_count integer;
  active_rules_count integer;
BEGIN
  -- Count available resources
  SELECT COUNT(*) INTO super_admin_count
  FROM public.admin_users
  WHERE role = 'super_admin' AND is_active = true;
  
  SELECT COUNT(*) INTO active_rules_count
  FROM public.lead_assignment_rules
  WHERE is_active = true;

  -- Create a test lead
  INSERT INTO public.leads (
    contact_name,
    email,
    organization_name,
    priority,
    source,
    notes
  ) VALUES (
    'Test Lead Assignment',
    'test-assignment@example.com',
    'Test Organization',
    'medium',
    'system_test',
    'This is a test lead for auto-assignment verification'
  ) RETURNING id INTO test_lead_id;

  -- Check the assignment result
  SELECT jsonb_build_object(
    'test_lead_id', test_lead_id,
    'assigned_to', assigned_to,
    'assigned_at', assigned_at,
    'status', status,
    'super_admin_count', super_admin_count,
    'active_rules_count', active_rules_count,
    'assignment_successful', (assigned_to IS NOT NULL)
  ) INTO assignment_result
  FROM public.leads
  WHERE id = test_lead_id;

  -- Clean up test lead
  DELETE FROM public.leads WHERE id = test_lead_id;
  DELETE FROM public.lead_assignments WHERE lead_id = test_lead_id;

  RETURN assignment_result;
END;
$function$;
