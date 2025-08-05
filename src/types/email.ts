
export interface EmailTemplate {
  id: string;
  tenant_id?: string;
  template_type: string;
  template_name: string;
  subject_template: string;
  html_template: string;
  text_template?: string;
  variables: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface EmailLog {
  id: string;
  tenant_id?: string;
  recipient_email: string;
  recipient_id?: string;
  template_id?: string;
  template_type: string;
  subject: string;
  status: EmailStatus;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  failed_at?: string;
  metadata: Record<string, any>;
  external_message_id?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailVerification {
  id: string;
  user_id: string;
  tenant_id?: string;
  email: string;
  verification_token: string;
  verification_type: string;
  is_verified: boolean;
  verified_at?: string;
  expires_at: string;
  created_at: string;
  metadata: Record<string, any>;
}

export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

export interface SendEmailRequest {
  to: string;
  templateType: string;
  variables: Record<string, string>;
  tenantId?: string;
  recipientId?: string;
  metadata?: Record<string, any>;
}

export interface TenantWelcomeEmailData {
  tenantName: string;
  userName: string;
  email: string;
  password: string;
  loginUrl: string;
  tenantId: string;
  userId: string;
}

export interface LeadConversionEmailData {
  tenantName: string;
  userName: string;
  email: string;
  password: string;
  loginUrl: string;
  tenantId: string;
  userId: string;
  leadId: string;
}

export interface EmailVerificationData {
  userName: string;
  verificationUrl: string;
  email: string;
  userId: string;
  tenantId?: string;
}
