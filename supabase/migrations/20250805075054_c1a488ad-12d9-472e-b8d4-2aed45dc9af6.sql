
-- Create email templates table for tenant-specific branding
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('activation', 'invite', 'password_reset', 'notification')),
  template_name text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text,
  sender_name text DEFAULT 'KisanShakti AI',
  sender_email text DEFAULT 'noreply@kisanshakti.in',
  is_active boolean DEFAULT true,
  variables jsonb DEFAULT '[]'::jsonb, -- Available template variables
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, template_type)
);

-- Create email logs table for audit trail
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  sender_email text NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  external_id text, -- From email service provider
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create user invitations table for tracking invite links
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  email text NOT NULL,
  user_id uuid, -- Will be set when auth user is created
  invitation_token text UNIQUE NOT NULL,
  invitation_type text NOT NULL DEFAULT 'tenant_activation' CHECK (invitation_type IN ('tenant_activation', 'admin_invite', 'password_reset')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'accepted', 'expired', 'cancelled')),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  sent_at timestamp with time zone,
  clicked_at timestamp with time zone,
  accepted_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Tenant users can manage their email templates" ON public.email_templates
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Super admins can manage all email templates" ON public.email_templates
  FOR ALL USING (is_authenticated_admin());

-- RLS Policies for email_logs  
CREATE POLICY "Tenant users can view their email logs" ON public.email_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Super admins can view all email logs" ON public.email_logs
  FOR ALL USING (is_authenticated_admin());

-- RLS Policies for user_invitations
CREATE POLICY "Tenant users can manage their invitations" ON public.user_invitations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Super admins can manage all invitations" ON public.user_invitations
  FOR ALL USING (is_authenticated_admin());

-- Function to validate invitation token
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token text)
RETURNS TABLE(
  invitation_id uuid,
  tenant_id uuid,
  email text,
  invitation_type text,
  is_valid boolean,
  expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ui.id,
    ui.tenant_id,
    ui.email,
    ui.invitation_type,
    (ui.status = 'sent' AND ui.expires_at > now()) as is_valid,
    ui.expires_at
  FROM public.user_invitations ui
  WHERE ui.invitation_token = token;
END;
$function$;

-- Function to mark invitation as clicked
CREATE OR REPLACE FUNCTION public.mark_invitation_clicked(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.user_invitations
  SET 
    status = 'clicked',
    clicked_at = now(),
    updated_at = now()
  WHERE invitation_token = token
    AND status = 'sent'
    AND expires_at > now();
    
  RETURN FOUND;
END;
$function$;

-- Function to mark invitation as accepted
CREATE OR REPLACE FUNCTION public.mark_invitation_accepted(token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.user_invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    updated_at = now()
  WHERE invitation_token = token
    AND status IN ('sent', 'clicked')
    AND expires_at > now();
    
  RETURN FOUND;
END;
$function$;

-- Insert default email templates for tenant activation
INSERT INTO public.email_templates (tenant_id, template_type, template_name, subject, html_content, text_content, variables) VALUES
(
  NULL, -- Global template
  'activation',
  'Tenant Activation Email',
  'Welcome to {{tenant_name}} - Activate Your Account',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{tenant_name}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); padding: 40px 20px; text-align: center; color: white; }
        .logo { max-height: 60px; margin-bottom: 20px; }
        .content { padding: 40px 30px; }
        .cta-button { display: inline-block; background: {{primary_color}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            {{#if tenant_logo}}
            <img src="{{tenant_logo}}" alt="{{tenant_name}}" class="logo">
            {{/if}}
            <h1>Welcome to {{tenant_name}}</h1>
        </div>
        <div class="content">
            <h2>Hi {{user_name}},</h2>
            <p>Congratulations! Your account has been created for <strong>{{tenant_name}}</strong>. We''re excited to have you on board.</p>
            <p>To get started, please activate your account by clicking the button below:</p>
            <div style="text-align: center;">
                <a href="{{activation_url}}" class="cta-button">Activate Your Account</a>
            </div>
            <p>This activation link will expire in 7 days for security reasons.</p>
            <p>If you have any questions or need assistance, please don''t hesitate to contact our support team.</p>
            <p>Best regards,<br>The {{tenant_name}} Team</p>
        </div>
        <div class="footer">
            <p>Need help? Contact us at {{support_email}}</p>
            <p>© {{current_year}} {{tenant_name}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
  'Welcome to {{tenant_name}}!

Hi {{user_name}},

Congratulations! Your account has been created for {{tenant_name}}. We''re excited to have you on board.

To get started, please activate your account by clicking the link below:
{{activation_url}}

This activation link will expire in 7 days for security reasons.

If you have any questions or need assistance, please contact our support team at {{support_email}}.

Best regards,
The {{tenant_name}} Team',
  '["tenant_name", "user_name", "tenant_logo", "primary_color", "secondary_color", "activation_url", "support_email", "current_year"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_created ON public.email_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON public.user_invitations(expires_at);

-- Add trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER handle_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
