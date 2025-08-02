
-- Phase 1: Fix Database Triggers and Assignment Rules

-- Step 1: Drop the problematic recursive trigger
DROP TRIGGER IF EXISTS update_lead_score_on_change ON public.leads;

-- Step 2: Create a non-recursive version of the lead score update trigger
CREATE OR REPLACE FUNCTION public.update_lead_score_trigger_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_score integer;
BEGIN
  -- Calculate score without updating the leads table directly
  new_score := public.calculate_lead_score(NEW.id);
  
  -- Only update the score field to avoid recursion
  IF NEW.lead_score != new_score THEN
    NEW.lead_score := new_score;
  END IF;
  
  -- Always update last_activity timestamp
  NEW.last_activity := now();
  
  RETURN NEW;
END;
$$;

-- Step 3: Create the new safe trigger
CREATE TRIGGER update_lead_score_on_change_safe
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_score_trigger_safe();

-- Step 4: Update the calculate_lead_score function to be non-recursive
CREATE OR REPLACE FUNCTION public.calculate_lead_score(lead_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_score integer := 0;
  rule_record RECORD;
  lead_data jsonb;
BEGIN
  -- Get lead data without triggering updates
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

  -- Return the calculated score without updating the table
  RETURN total_score;
END;
$$;

-- Step 5: Create a default assignment rule if none exists
INSERT INTO public.lead_assignment_rules (
  rule_name,
  rule_type,
  conditions,
  admin_pool,
  is_active,
  priority_order,
  created_at,
  updated_at
)
SELECT 
  'Default Round Robin Assignment',
  'round_robin',
  '{"auto_assign": true}'::jsonb,
  COALESCE(
    (SELECT array_agg(id::text) FROM public.admin_users WHERE is_active = true AND role IN ('super_admin', 'platform_admin', 'admin')),
    ARRAY[]::text[]
  ),
  true,
  1,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_assignment_rules WHERE is_active = true
);

-- Step 6: Create default scoring rules if none exist
INSERT INTO public.lead_scoring_rules (
  rule_name,
  rule_type,
  conditions,
  score_value,
  is_active,
  created_at,
  updated_at
)
VALUES 
  ('Organization Name Provided', 'demographic', '{"has_organization": true}'::jsonb, 10, true, now(), now()),
  ('High Priority Lead', 'behavioral', '{"priority": "high"}'::jsonb, 15, true, now(), now()),
  ('Lead Contacted', 'engagement', '{"status": "contacted"}'::jsonb, 20, true, now(), now())
ON CONFLICT DO NOTHING;

-- Step 7: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Step 8: Update any leads with NULL lead_score to 0
UPDATE public.leads 
SET lead_score = COALESCE(lead_score, 0), 
    qualification_score = COALESCE(qualification_score, 0)
WHERE lead_score IS NULL OR qualification_score IS NULL;
