
-- Extend the leads table with assignment fields
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.admin_users(id),
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'contacted', 'qualified', 'converted', 'rejected')),
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS qualification_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS converted_tenant_id uuid REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS converted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS last_contact_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_follow_up_at timestamp with time zone;

-- Create lead assignment rules table
CREATE TABLE IF NOT EXISTS public.lead_assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('round_robin', 'load_balanced', 'territory', 'skill_based')),
  conditions jsonb DEFAULT '{}',
  admin_pool uuid[] NOT NULL, -- Array of admin user IDs
  is_active boolean DEFAULT true,
  priority_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.admin_users(id)
);

-- Create lead assignment history table for audit trail
CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  assigned_from uuid REFERENCES public.admin_users(id),
  assigned_to uuid NOT NULL REFERENCES public.admin_users(id),
  assignment_type text NOT NULL CHECK (assignment_type IN ('auto', 'manual', 'reassign')),
  assignment_reason text,
  assigned_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Create team invitations table for lead-to-tenant conversion
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id),
  tenant_id uuid REFERENCES public.tenants(id),
  invited_email text NOT NULL,
  invited_name text,
  role text NOT NULL DEFAULT 'tenant_admin',
  invitation_token text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  sent_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  created_by uuid REFERENCES public.admin_users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_assignment_rules
CREATE POLICY "Admins can manage assignment rules" ON public.lead_assignment_rules
  FOR ALL USING (is_authenticated_admin());

-- RLS policies for lead_assignments
CREATE POLICY "Admins can view assignment history" ON public.lead_assignments
  FOR SELECT USING (is_authenticated_admin());

CREATE POLICY "System can insert assignments" ON public.lead_assignments
  FOR INSERT WITH CHECK (true);

-- RLS policies for team_invitations
CREATE POLICY "Admins can manage team invitations" ON public.team_invitations
  FOR ALL USING (is_authenticated_admin());

CREATE POLICY "Public can read invitations by token" ON public.team_invitations
  FOR SELECT USING (true);

-- Function to auto-assign leads using round-robin
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS trigger AS $$
DECLARE
  admin_id uuid;
  rule_record RECORD;
BEGIN
  -- Find active assignment rule with highest priority
  SELECT * INTO rule_record
  FROM public.lead_assignment_rules
  WHERE is_active = true
  ORDER BY priority_order ASC, created_at ASC
  LIMIT 1;

  IF rule_record IS NOT NULL THEN
    -- Simple round-robin assignment
    SELECT admin_pool[
      (COALESCE((SELECT COUNT(*) FROM public.lead_assignments WHERE assigned_at::date = CURRENT_DATE), 0) % array_length(admin_pool, 1)) + 1
    ] INTO admin_id
    FROM public.lead_assignment_rules
    WHERE id = rule_record.id;

    -- Update the lead with assignment
    NEW.assigned_to = admin_id;
    NEW.assigned_at = now();
    NEW.status = 'assigned';

    -- Log the assignment
    INSERT INTO public.lead_assignments (lead_id, assigned_to, assignment_type, assignment_reason)
    VALUES (NEW.id, admin_id, 'auto', 'Auto-assigned via rule: ' || rule_record.rule_name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert qualified lead to tenant
CREATE OR REPLACE FUNCTION public.convert_lead_to_tenant(
  p_lead_id uuid,
  p_tenant_name text,
  p_tenant_slug text,
  p_subscription_plan text DEFAULT 'Kisan_Basic',
  p_admin_email text DEFAULT NULL,
  p_admin_name text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_lead_record RECORD;
  v_tenant_id uuid;
  v_invitation_token text;
  v_result jsonb;
BEGIN
  -- Get lead details
  SELECT * INTO v_lead_record FROM public.leads WHERE id = p_lead_id AND status = 'qualified';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found or not qualified');
  END IF;

  -- Create tenant using existing function
  SELECT jsonb_extract_path_text(
    public.create_tenant_with_validation(
      p_tenant_name,
      p_tenant_slug,
      'agri_company',
      'trial',
      p_subscription_plan,
      COALESCE(p_admin_name, v_lead_record.contact_name),
      COALESCE(p_admin_email, v_lead_record.email)
    ),
    'data', 'tenant_id'
  )::uuid INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create tenant');
  END IF;

  -- Generate invitation token
  v_invitation_token := encode(gen_random_bytes(32), 'base64');

  -- Create team invitation
  INSERT INTO public.team_invitations (
    lead_id,
    tenant_id,
    invited_email,
    invited_name,
    role,
    invitation_token,
    created_by
  ) VALUES (
    p_lead_id,
    v_tenant_id,
    COALESCE(p_admin_email, v_lead_record.email),
    COALESCE(p_admin_name, v_lead_record.contact_name),
    'tenant_admin',
    v_invitation_token,
    auth.uid()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reassign lead
CREATE OR REPLACE FUNCTION public.reassign_lead(
  p_lead_id uuid,
  p_new_admin_id uuid,
  p_reason text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_old_admin_id uuid;
BEGIN
  -- Get current assignment
  SELECT assigned_to INTO v_old_admin_id FROM public.leads WHERE id = p_lead_id;

  -- Update lead assignment
  UPDATE public.leads 
  SET 
    assigned_to = p_new_admin_id,
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;

  -- Log the reassignment
  INSERT INTO public.lead_assignments (lead_id, assigned_from, assigned_to, assignment_type, assignment_reason)
  VALUES (p_lead_id, v_old_admin_id, p_new_admin_id, 'reassign', COALESCE(p_reason, 'Manual reassignment'));

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-assignment of new leads
CREATE OR REPLACE TRIGGER auto_assign_new_leads
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_lead();

-- Update triggers for timestamp management
CREATE OR REPLACE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_assignment_rules_updated_at
  BEFORE UPDATE ON public.lead_assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
