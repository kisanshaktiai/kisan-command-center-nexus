
-- Fix the infinite recursion issue in lead scoring triggers

-- Step 1: Fix the calculate_lead_score function to only return the score (no UPDATE)
CREATE OR REPLACE FUNCTION public.calculate_lead_score(lead_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  total_score integer := 0;
  rule_record RECORD;
  lead_data jsonb;
BEGIN
  -- Get lead data
  SELECT to_jsonb(leads.*) INTO lead_data
  FROM public.leads
  WHERE id = lead_id;

  -- Calculate score based on active rules
  FOR rule_record IN
    SELECT * FROM public.lead_scoring_rules
    WHERE is_active = true
  LOOP
    -- Simple scoring logic - can be enhanced based on conditions
    CASE rule_record.rule_type
      WHEN 'demographic' THEN
        IF lead_data->>'organization_name' IS NOT NULL THEN
          total_score := total_score + rule_record.score_value;
        END IF;
      WHEN 'engagement' THEN
        IF lead_data->>'status' = 'contacted' THEN
          total_score := total_score + rule_record.score_value;
        END IF;
      WHEN 'behavioral' THEN
        IF lead_data->>'priority' = 'high' THEN
          total_score := total_score + rule_record.score_value;
        END IF;
    END CASE;
  END LOOP;

  -- Only return the score, don't update the table
  RETURN total_score;
END;
$function$;

-- Step 2: Update the trigger function to set the score directly
CREATE OR REPLACE FUNCTION public.update_lead_score_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only calculate score on relevant changes to avoid unnecessary work
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       OLD.status IS DISTINCT FROM NEW.status OR
       OLD.priority IS DISTINCT FROM NEW.priority OR
       OLD.organization_name IS DISTINCT FROM NEW.organization_name
     )) THEN
    
    -- Calculate and set the lead score directly
    NEW.lead_score = public.calculate_lead_score(NEW.id);
  END IF;
  
  -- Update last_activity timestamp
  NEW.last_activity = now();
  
  RETURN NEW;
END;
$function$;

-- Step 3: Drop the redundant trigger that was causing the recursion
DROP TRIGGER IF EXISTS update_lead_score_on_change ON public.leads;
