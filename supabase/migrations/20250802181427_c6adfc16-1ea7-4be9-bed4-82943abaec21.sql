
-- Add status transition validation function
CREATE OR REPLACE FUNCTION public.validate_lead_status_transition(
  p_lead_id uuid,
  p_old_status text,
  p_new_status text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lead_has_assignment boolean;
BEGIN
  -- Check if lead has assignment when required
  SELECT assigned_to IS NOT NULL INTO lead_has_assignment
  FROM public.leads 
  WHERE id = p_lead_id;

  -- Define valid transitions
  CASE p_old_status
    WHEN 'new' THEN
      -- New leads can go to assigned or contacted
      RETURN p_new_status IN ('assigned', 'contacted');
    WHEN 'assigned' THEN
      -- Assigned leads can go to contacted or back to new
      RETURN p_new_status IN ('contacted', 'new');
    WHEN 'contacted' THEN
      -- Contacted leads can go to qualified, rejected, or back to assigned
      RETURN p_new_status IN ('qualified', 'rejected', 'assigned');
    WHEN 'qualified' THEN
      -- Qualified leads can be converted, rejected, or go back to contacted
      RETURN p_new_status IN ('converted', 'rejected', 'contacted');
    WHEN 'converted' THEN
      -- Converted leads cannot change status
      RETURN false;
    WHEN 'rejected' THEN
      -- Rejected leads can be reactivated to previous states
      RETURN p_new_status IN ('new', 'assigned', 'contacted');
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Update the lead status update trigger to include validation
CREATE OR REPLACE FUNCTION public.validate_and_log_lead_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate status transitions
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NOT public.validate_lead_status_transition(NEW.id, OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;

    -- Log status change activity
    INSERT INTO public.lead_activities (
      lead_id,
      activity_type,
      title,
      description,
      completed_at,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      'status_change',
      'Status Updated',
      format('Status changed from %s to %s', OLD.status, NEW.status),
      now(),
      auth.uid(),
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );

    -- Update last_activity
    NEW.last_activity = now();
  END IF;

  -- Log assignment changes
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.lead_activities (
      lead_id,
      activity_type,
      title,
      description,
      completed_at,
      created_by,
      metadata
    ) VALUES (
      NEW.id,
      'assignment_change',
      'Lead Reassigned',
      CASE 
        WHEN OLD.assigned_to IS NULL THEN 'Lead assigned to admin'
        WHEN NEW.assigned_to IS NULL THEN 'Lead unassigned'
        ELSE 'Lead reassigned to different admin'
      END,
      now(),
      auth.uid(),
      jsonb_build_object('old_admin_id', OLD.assigned_to, 'new_admin_id', NEW.assigned_to)
    );
  END IF;

  -- Auto-calculate lead score
  PERFORM public.calculate_lead_score(NEW.id);

  RETURN NEW;
END;
$$;

-- Drop existing trigger and create new one
DROP TRIGGER IF EXISTS log_lead_activity ON public.leads;
DROP TRIGGER IF EXISTS update_lead_score_trigger ON public.leads;

CREATE TRIGGER validate_and_log_lead_changes
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_log_lead_changes();

-- Create default assignment rule if none exists
INSERT INTO public.lead_assignment_rules (
  rule_name,
  rule_type,
  conditions,
  admin_pool,
  is_active,
  priority_order
) 
SELECT 
  'Default Round Robin',
  'round_robin',
  '{"auto_assign": true}'::jsonb,
  ARRAY(SELECT id::text FROM public.admin_users WHERE is_active = true LIMIT 5),
  true,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_assignment_rules WHERE is_active = true
);

-- Fix auto-assignment trigger
CREATE OR REPLACE FUNCTION public.auto_assign_lead_on_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id uuid;
  rule_record RECORD;
  admin_count integer;
  assignment_count integer;
BEGIN
  -- Only auto-assign new leads
  IF NEW.status = 'new' AND NEW.assigned_to IS NULL THEN
    -- Find active assignment rule with highest priority
    SELECT * INTO rule_record
    FROM public.lead_assignment_rules
    WHERE is_active = true
    ORDER BY priority_order ASC, created_at ASC
    LIMIT 1;

    IF rule_record IS NOT NULL AND array_length(rule_record.admin_pool, 1) > 0 THEN
      -- Simple round-robin assignment
      SELECT COUNT(*) INTO assignment_count
      FROM public.lead_assignments 
      WHERE assigned_at::date = CURRENT_DATE;
      
      SELECT array_length(rule_record.admin_pool, 1) INTO admin_count;
      
      SELECT rule_record.admin_pool[((assignment_count % admin_count) + 1)]::uuid INTO admin_id;

      -- Update the lead with assignment
      NEW.assigned_to = admin_id;
      NEW.assigned_at = now();
      NEW.status = 'assigned';

      -- Log the assignment (will be handled by separate trigger)
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment on INSERT
CREATE TRIGGER auto_assign_lead_on_creation
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_lead_on_creation();

-- Create function to get valid next statuses
CREATE OR REPLACE FUNCTION public.get_valid_next_statuses(current_status text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE current_status
    WHEN 'new' THEN
      RETURN ARRAY['assigned', 'contacted'];
    WHEN 'assigned' THEN
      RETURN ARRAY['contacted', 'new'];
    WHEN 'contacted' THEN
      RETURN ARRAY['qualified', 'rejected', 'assigned'];
    WHEN 'qualified' THEN
      RETURN ARRAY['converted', 'rejected', 'contacted'];
    WHEN 'converted' THEN
      RETURN ARRAY[]::text[];
    WHEN 'rejected' THEN
      RETURN ARRAY['new', 'assigned', 'contacted'];
    ELSE
      RETURN ARRAY[]::text[];
  END CASE;
END;
$$;
