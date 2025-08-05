
-- First, let's check if the email tables exist and drop them to recreate with correct schema
DROP TABLE IF EXISTS public.email_verifications CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;

-- Create email_templates table with correct schema
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT,
  UNIQUE(tenant_id, template_type, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create email_logs table with correct schema  
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_id TEXT,
  template_id UUID REFERENCES public.email_templates(id),
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  external_message_id TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create email_verifications table with correct schema
CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verification_token TEXT NOT NULL UNIQUE,
  verification_type TEXT NOT NULL DEFAULT 'email_verification',
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Add RLS policies
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Email templates policies
CREATE POLICY "Super admins can manage all email templates" ON public.email_templates
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenant users can view email templates" ON public.email_templates
  FOR SELECT USING (
    tenant_id IN (
      SELECT user_tenants.tenant_id FROM user_tenants 
      WHERE user_tenants.user_id = auth.uid() 
      AND user_tenants.is_active = true
    ) OR tenant_id IS NULL
  );

-- Email logs policies  
CREATE POLICY "Super admins can view all email logs" ON public.email_logs
  FOR ALL USING (is_super_admin());

CREATE POLICY "System can manage email logs" ON public.email_logs
  FOR ALL USING (true);

-- Email verifications policies
CREATE POLICY "System can manage verifications" ON public.email_verifications
  FOR ALL USING (true);

-- Create indexes
CREATE INDEX idx_email_templates_tenant_type ON public.email_templates(tenant_id, template_type);
CREATE INDEX idx_email_logs_tenant_status ON public.email_logs(tenant_id, status);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX idx_email_verifications_token ON public.email_verifications(verification_token);

-- Create updated_at triggers
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default email templates
INSERT INTO public.email_templates (tenant_id, template_type, template_name, subject_template, html_template, text_template, variables, is_default) VALUES
(NULL, 'tenant_welcome', 'Default Tenant Welcome', 
 'Welcome to {tenant_name}!', 
 '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Welcome to {tenant_name}!</h1><p>Hello {user_name},</p><p>Your account has been created successfully.</p><div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;"><h3>Login Details:</h3><p><strong>Email:</strong> {email}<br><strong>Password:</strong> {password}</p></div><p>Please change your password after first login.</p><p><a href="{login_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Login Now</a></p></div>', 
 'Welcome to {tenant_name}! Hello {user_name}, Your account has been created successfully. Login Details: Email: {email}, Password: {password}. Please change your password after first login. Login at: {login_url}',
 ARRAY['tenant_name', 'user_name', 'email', 'password', 'login_url'], 
 true),
 
(NULL, 'lead_conversion', 'Default Lead Conversion', 
 'Welcome to {tenant_name} - Your Account is Ready!', 
 '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Welcome to {tenant_name}!</h1><p>Dear {user_name},</p><p>Congratulations! Your lead has been converted to a tenant account.</p><div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;"><h3>Login Credentials:</h3><p><strong>Email:</strong> {email}<br><strong>Password:</strong> {password}<br><strong>Tenant:</strong> {tenant_name}</p></div><p><strong>Important:</strong> Please change your password after your first login for security purposes.</p><p><a href="{login_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Login to Your Account</a></p></div>', 
 'Welcome to {tenant_name}! Dear {user_name}, Congratulations! Your lead has been converted to a tenant account. Login Details: Email: {email}, Password: {password}, Tenant: {tenant_name}. Login at: {login_url}',
 ARRAY['tenant_name', 'user_name', 'email', 'password', 'login_url'], 
 true),
 
(NULL, 'email_verification', 'Default Email Verification', 
 'Verify your email address', 
 '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Please verify your email address</h1><p>Hello {user_name},</p><p>Please click the link below to verify your email address:</p><p><a href="{verification_url}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Verify Email</a></p><p>This link will expire in 24 hours.</p></div>', 
 'Please verify your email address. Hello {user_name}, Please visit the following link to verify your email address: {verification_url}. This link will expire in 24 hours.',
 ARRAY['user_name', 'verification_url'], 
 true);
