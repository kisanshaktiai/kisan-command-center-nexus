
-- Enable real-time for leads table
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Add missing fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_temperature text CHECK (lead_temperature IN ('hot', 'warm', 'cold')),
ADD COLUMN IF NOT EXISTS marketing_qualified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sales_qualified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS demo_scheduled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS proposal_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contract_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_activity timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0;

-- Create lead_activities table for tracking interactions
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'status_change')),
  title text NOT NULL,
  description text,
  outcome text,
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS and create policies for lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all lead activities"
ON public.lead_activities FOR ALL
USING (is_authenticated_admin())
WITH CHECK (is_authenticated_admin());

CREATE POLICY "Assigned admins can view lead activities"
ON public.lead_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_activities.lead_id 
    AND leads.assigned_to = auth.uid()
  )
);

-- Create lead_scoring_rules table
CREATE TABLE IF NOT EXISTS public.lead_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('demographic', 'behavioral', 'engagement', 'company')),
  conditions jsonb NOT NULL,
  score_value integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for lead_scoring_rules
ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage scoring rules"
ON public.lead_scoring_rules FOR ALL
USING (is_authenticated_admin())
WITH CHECK (is_authenticated_admin());

-- Create lead_communication_logs table
CREATE TABLE IF NOT EXISTS public.lead_communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  communication_type text NOT NULL CHECK (communication_type IN ('email', 'call', 'sms', 'meeting', 'linkedin')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  content text,
  status text DEFAULT 'sent',
  sent_at timestamp with time zone DEFAULT now(),
  opened_at timestamp with time zone,
  replied_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for lead_communication_logs
ALTER TABLE public.lead_communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage communication logs"
ON public.lead_communication_logs FOR ALL
USING (is_authenticated_admin())
WITH CHECK (is_authenticated_admin());

-- Create lead_tags table for flexible tagging
CREATE TABLE IF NOT EXISTS public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  tag_color text DEFAULT '#3B82F6',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(lead_id, tag_name)
);

-- Enable RLS for lead_tags
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage lead tags"
ON public.lead_tags FOR ALL
USING (is_authenticated_admin())
WITH CHECK (is_authenticated_admin());

-- Enable real-time for new tables
ALTER TABLE public.lead_activities REPLICA IDENTITY FULL;
ALTER TABLE public.lead_communication_logs REPLICA IDENTITY FULL;
ALTER TABLE public.lead_tags REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_communication_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_tags;

-- Create function to calculate lead score
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

  -- Update lead score
  UPDATE public.leads
  SET lead_score = total_score, updated_at = now()
  WHERE id = lead_id;

  RETURN total_score;
END;
$$;

-- Create trigger to update lead score on changes
CREATE OR REPLACE FUNCTION public.update_lead_score_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update lead score
  PERFORM public.calculate_lead_score(NEW.id);
  
  -- Update last_activity timestamp
  NEW.last_activity = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger for lead updates
CREATE TRIGGER update_lead_score_on_change
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_score_trigger();

-- Create function to log lead activities automatically
CREATE OR REPLACE FUNCTION public.log_lead_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.lead_activities (
      lead_id,
      activity_type,
      title,
      description,
      completed_at,
      created_by
    ) VALUES (
      NEW.id,
      'status_change',
      'Status Updated',
      format('Status changed from %s to %s', OLD.status, NEW.status),
      now(),
      auth.uid()
    );
  END IF;

  -- Log assignment changes
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.lead_activities (
      lead_id,
      activity_type,
      title,
      description,
      completed_at,
      created_by
    ) VALUES (
      NEW.id,
      'note',
      'Lead Reassigned',
      format('Lead reassigned to new admin'),
      now(),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for automatic activity logging
CREATE TRIGGER log_lead_activity_trigger
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_activity();

-- Insert default scoring rules
INSERT INTO public.lead_scoring_rules (rule_name, rule_type, conditions, score_value) VALUES
('Has Organization', 'demographic', '{"field": "organization_name", "operator": "not_null"}', 10),
('High Priority', 'behavioral', '{"field": "priority", "operator": "equals", "value": "high"}', 15),
('Contacted Status', 'engagement', '{"field": "status", "operator": "equals", "value": "contacted"}', 20),
('Qualified Status', 'engagement', '{"field": "status", "operator": "equals", "value": "qualified"}', 50)
ON CONFLICT DO NOTHING;
