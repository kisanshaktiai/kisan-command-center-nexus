
-- Fix the infinite recursion issue in lead scoring triggers
-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS update_lead_score_on_change ON public.leads;

-- Recreate the calculate_lead_score function to avoid recursion
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

  -- Return the score without updating the table to avoid recursion
  RETURN total_score;
END;
$function$;

-- Create a non-recursive trigger function for lead updates
CREATE OR REPLACE FUNCTION public.update_lead_score_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  calculated_score integer;
BEGIN
  -- Only calculate score if certain fields changed, not on every update
  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.priority IS DISTINCT FROM NEW.priority OR
    OLD.organization_name IS DISTINCT FROM NEW.organization_name
  ) THEN
    -- Calculate score without updating the table
    calculated_score := public.calculate_lead_score(NEW.id);
    
    -- Set the score in the NEW record being updated
    NEW.lead_score := calculated_score;
  END IF;
  
  -- Update last_activity timestamp only on status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_activity := now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger with the fixed function
CREATE TRIGGER update_lead_score_on_change
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_score_trigger();

-- Insert default lead scoring rules if table is empty
INSERT INTO public.lead_scoring_rules (rule_name, rule_type, conditions, score_value, is_active)
SELECT * FROM (VALUES
  ('Organization Name Present', 'demographic', '{"has_organization": true}', 20, true),
  ('High Priority Lead', 'behavioral', '{"priority": "high"}', 30, true),
  ('Contacted Status', 'engagement', '{"status": "contacted"}', 25, true),
  ('Email Domain Check', 'demographic', '{"business_email": true}', 15, true),
  ('Phone Number Present', 'demographic', '{"has_phone": true}', 10, true)
) AS v(rule_name, rule_type, conditions, score_value, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.lead_scoring_rules LIMIT 1);

-- Fix the convert_lead_to_tenant function to accept 'new' status leads
CREATE OR REPLACE FUNCTION public.convert_lead_to_tenant(p_lead_id uuid, p_tenant_name text, p_tenant_slug text, p_subscription_plan text DEFAULT 'Kisan_Basic'::text, p_admin_email text DEFAULT NULL::text, p_admin_name text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_lead_record RECORD;
  v_tenant_id uuid;
  v_invitation_token text;
  v_result jsonb;
BEGIN
  -- Get lead details (allow 'new' status leads, not just 'qualified')
  SELECT * INTO v_lead_record 
  FROM public.leads 
  WHERE id = p_lead_id 
  AND status IN ('new', 'qualified', 'contacted');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Lead not found or cannot be converted. Lead must have status: new, qualified, or contacted'
    );
  END IF;

  -- Generate tenant ID
  v_tenant_id := gen_random_uuid();

  -- Create the actual tenant record
  INSERT INTO public.tenants (
    id,
    name,
    slug,
    type,
    status,
    subscription_plan,
    owner_name,
    owner_email,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    p_tenant_name,
    p_tenant_slug,
    'agri_company',
    'trial',
    p_subscription_plan,
    COALESCE(p_admin_name, v_lead_record.contact_name),
    COALESCE(p_admin_email, v_lead_record.email),
    now(),
    now()
  );

  -- Generate invitation token
  v_invitation_token := encode(gen_random_bytes(32), 'base64');

  -- Create team invitation (remove lead_id as it doesn't exist in schema)
  INSERT INTO public.team_invitations (
    tenant_id,
    invited_email,
    invited_name,
    role,
    invitation_token,
    created_by,
    expires_at
  ) VALUES (
    v_tenant_id,
    COALESCE(p_admin_email, v_lead_record.email),
    COALESCE(p_admin_name, v_lead_record.contact_name),
    'tenant_admin',
    v_invitation_token,
    auth.uid(),
    now() + interval '7 days'
  );

  -- Update lead status
  UPDATE public.leads 
  SET 
    status = 'converted',
    converted_tenant_id = v_tenant_id,
    converted_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;

  v_result := jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'invitation_token', v_invitation_token,
    'message', 'Lead successfully converted to tenant'
  );

  RETURN v_result;
END;
$function$;

-- Clean up duplicate RLS policies on leads table
DROP POLICY IF EXISTS "Admin users can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads;
DROP POLICY IF EXISTS "Super admins can manage all leads" ON public.leads;

-- Create a single, clear RLS policy for leads
CREATE POLICY "Authenticated admins can manage leads"
ON public.leads
FOR ALL
TO authenticated
USING (is_authenticated_admin())
WITH CHECK (is_authenticated_admin());
