-- Phase 1: Enhance email_templates table structure
ALTER TABLE email_templates 
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS preview_text text,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_template_id uuid REFERENCES email_templates(id);

-- Create email template categories table
CREATE TABLE IF NOT EXISTS email_template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert default categories
INSERT INTO email_template_categories (name, description, icon, sort_order) VALUES
  ('Authentication', 'Login, signup, password reset, email verification emails', 'Lock', 1),
  ('Transactional', 'Order confirmations, receipts, notifications', 'Receipt', 2),
  ('System', 'System alerts, maintenance notifications', 'Bell', 3),
  ('Marketing', 'Newsletters, promotions, announcements', 'Mail', 4),
  ('Onboarding', 'Welcome emails, getting started guides', 'UserPlus', 5)
ON CONFLICT (name) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_type ON email_templates(tenant_id, template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

-- Add RLS policies for email_templates (if not exists)
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read email templates" ON email_templates;
CREATE POLICY "Allow authenticated users to read email templates" 
  ON email_templates FOR SELECT 
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage email templates" ON email_templates;
CREATE POLICY "Allow authenticated users to manage email templates" 
  ON email_templates FOR ALL 
  USING (auth.role() = 'authenticated');

-- Add RLS for email_template_categories
ALTER TABLE email_template_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON email_template_categories;
CREATE POLICY "Allow authenticated users to read categories" 
  ON email_template_categories FOR SELECT 
  USING (auth.role() = 'authenticated');