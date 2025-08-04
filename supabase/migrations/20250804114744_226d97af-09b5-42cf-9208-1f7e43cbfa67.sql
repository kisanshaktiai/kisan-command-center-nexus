
-- Add AI and analytics columns to leads table
ALTER TABLE leads ADD COLUMN ai_score INTEGER;
ALTER TABLE leads ADD COLUMN ai_recommended_action TEXT;
ALTER TABLE leads ADD COLUMN source_id TEXT;
ALTER TABLE leads ADD COLUMN campaign_id TEXT;
ALTER TABLE leads ADD COLUMN custom_fields JSONB DEFAULT '[]'::jsonb;

-- Create custom field configuration table
CREATE TABLE lead_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  field_label TEXT,
  field_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  options JSONB DEFAULT '{}'::jsonb,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create audit log table for lead activities
CREATE TABLE lead_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  tenant_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  old_values JSONB DEFAULT '{}'::jsonb,
  new_values JSONB DEFAULT '{}'::jsonb,
  performed_by UUID,
  source TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create communication log table (enhanced version)
CREATE TABLE lead_communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- email, sms, etc
  subject TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE lead_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_communication_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom fields
CREATE POLICY "Tenant users can manage their custom fields" 
ON lead_custom_fields 
FOR ALL 
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS policies for audit logs
CREATE POLICY "Tenant users can view their audit logs" 
ON lead_audit_logs 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "System can insert audit logs" 
ON lead_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for communication templates
CREATE POLICY "Tenant users can manage their communication templates" 
ON lead_communication_templates 
FOR ALL 
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Add indexes for performance
CREATE INDEX idx_lead_custom_fields_tenant ON lead_custom_fields(tenant_id);
CREATE INDEX idx_lead_audit_logs_lead ON lead_audit_logs(lead_id);
CREATE INDEX idx_lead_audit_logs_tenant ON lead_audit_logs(tenant_id);
CREATE INDEX idx_lead_communication_templates_tenant ON lead_communication_templates(tenant_id);
