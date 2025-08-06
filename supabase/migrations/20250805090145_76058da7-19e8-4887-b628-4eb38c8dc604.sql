
-- Create email_templates table for storing tenant-specific email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  UNIQUE(tenant_id, template_type, template_name)
);

-- Create email_logs table for tracking all email send attempts
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_id UUID,
  template_id UUID REFERENCES public.email_templates(id),
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  external_message_id TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_verifications table for storing verification tokens
CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verification_token TEXT NOT NULL UNIQUE,
  verification_type TEXT NOT NULL DEFAULT 'email_verification',
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS policies for email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all email templates" ON public.email_templates
  FOR ALL USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Tenant users can manage their email templates" ON public.email_templates
  FOR ALL USING (
    tenant_id IN (
      SELECT user_tenants.tenant_id FROM user_tenants 
      WHERE user_tenants.user_id = auth.uid() 
      AND user_tenants.is_active = true
      AND user_tenants.role = ANY(ARRAY['tenant_owner'::user_role, 'tenant_admin'::user_role])
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT user_tenants.tenant_id FROM user_tenants 
      WHERE user_tenants.user_id = auth.uid() 
      AND user_tenants.is_active = true
      AND user_tenants.role = ANY(ARRAY['tenant_owner'::user_role, 'tenant_admin'::user_role])
    )
  );

-- Add RLS policies for email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all email logs" ON public.email_logs
  FOR SELECT USING (is_super_admin());

CREATE POLICY "Tenant users can view their email logs" ON public.email_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT user_tenants.tenant_id FROM user_tenants 
      WHERE user_tenants.user_id = auth.uid() 
      AND user_tenants.is_active = true
    )
  );

CREATE POLICY "System can insert email logs" ON public.email_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update email logs" ON public.email_logs
  FOR UPDATE USING (true);

-- Add RLS policies for email_verifications
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verifications" ON public.email_verifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage verifications" ON public.email_verifications
  FOR ALL USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_email_templates_tenant_type ON public.email_templates(tenant_id, template_type);
CREATE INDEX idx_email_logs_tenant_status ON public.email_logs(tenant_id, status);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX idx_email_verifications_token ON public.email_verifications(verification_token);
CREATE INDEX idx_email_verifications_email ON public.email_verifications(email);

-- Create updated_at trigger for email_templates
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create updated_at trigger for email_logs
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default email templates
INSERT INTO public.email_templates (tenant_id, template_type, template_name, subject_template, html_template, text_template, variables, is_default) VALUES
(NULL, 'tenant_welcome', 'Default Tenant Welcome', 
 'Welcome to {tenant_name}!', 
 '<h1>Welcome to {tenant_name}!</h1><p>Hello {user_name},</p><p>Your account has been created successfully.</p><p><strong>Login Details:</strong><br>Email: {email}<br>Password: {password}</p><p>Please change your password after first login.</p><p><a href="{login_url}">Login Now</a></p>', 
 'Welcome to {tenant_name}! Hello {user_name}, Your account has been created successfully. Login Details: Email: {email}, Password: {password}. Please change your password after first login. Login at: {login_url}',
 '["tenant_name", "user_name", "email", "password", "login_url"]'::jsonb, 
 true),
 
(NULL, 'lead_conversion', 'Default Lead Conversion', 
 'Your {tenant_name} account is ready!', 
 '<h1>Congratulations! Your lead has been converted to a tenant account.</h1><p>Hello {user_name},</p><p>Welcome to {tenant_name}!</p><p><strong>Login Details:</strong><br>Email: {email}<br>Password: {password}</p><p><a href="{login_url}">Access Your Dashboard</a></p>', 
 'Congratulations! Your lead has been converted to a tenant account. Hello {user_name}, Welcome to {tenant_name}! Login Details: Email: {email}, Password: {password}. Access your dashboard at: {login_url}',
 '["tenant_name", "user_name", "email", "password", "login_url"]'::jsonb, 
 true),
 
(NULL, 'email_verification', 'Default Email Verification', 
 'Verify your email address', 
 '<h1>Please verify your email address</h1><p>Hello {user_name},</p><p>Please click the link below to verify your email address:</p><p><a href="{verification_url}">Verify Email</a></p><p>This link will expire in 24 hours.</p>', 
 'Please verify your email address. Hello {user_name}, Please visit the following link to verify your email address: {verification_url}. This link will expire in 24 hours.',
 '["user_name", "verification_url"]'::jsonb, 
 true);
