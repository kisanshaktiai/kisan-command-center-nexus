
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';

export interface EmailRequest {
  type: 'activation' | 'invite' | 'password_reset' | 'notification';
  tenantId: string;
  recipientEmail: string;
  recipientName: string;
  templateData: Record<string, any>;
  invitationToken?: string;
  leadId?: string;
}

export interface CreateTenantUserRequest {
  tenantId: string;
  email: string;
  fullName: string;
  leadId?: string;
  role?: string;
  sendActivationEmail?: boolean;
}

export interface EmailTemplate {
  id: string;
  tenant_id: string | null;
  template_type: string;
  template_name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  sender_name: string;
  sender_email: string;
  is_active: boolean;
  variables: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  tenant_id: string;
  recipient_email: string;
  sender_email: string;
  template_type: string;
  subject: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  external_id?: string;
  error_message?: string;
  metadata: Record<string, any>;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserInvitation {
  id: string;
  tenant_id: string;
  lead_id?: string;
  email: string;
  user_id?: string;
  invitation_token: string;
  invitation_type: 'tenant_activation' | 'admin_invite' | 'password_reset';
  status: 'pending' | 'sent' | 'clicked' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  sent_at?: string;
  clicked_at?: string;
  accepted_at?: string;
  metadata: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Centralized Email Service
 * Handles all email operations including sending, template management, and user invitations
 */
export class CentralizedEmailService extends BaseService {
  
  /**
   * Send an email using the centralized email service
   */
  static async sendEmail(emailRequest: EmailRequest): Promise<ServiceResult<{ email_id: string }>> {
    try {
      console.log('CentralizedEmailService: Sending email', emailRequest);

      const { data, error } = await supabase.functions.invoke('centralized-email-service', {
        body: emailRequest
      });

      if (error) {
        console.error('CentralizedEmailService: Email sending failed:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Email sending failed');
      }

      console.log('CentralizedEmailService: Email sent successfully:', data.email_id);
      return { success: true, data: { email_id: data.email_id } };

    } catch (error) {
      console.error('CentralizedEmailService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  /**
   * Create a tenant user and optionally send activation email
   */
  static async createTenantUser(request: CreateTenantUserRequest): Promise<ServiceResult<{
    user_id: string;
    invitation_token: string;
    activation_url?: string;
    email_sent: boolean;
  }>> {
    try {
      console.log('CentralizedEmailService: Creating tenant user', request);

      const { data, error } = await supabase.functions.invoke('create-tenant-user', {
        body: request
      });

      if (error) {
        console.error('CentralizedEmailService: User creation failed:', error);
        throw new Error(`Failed to create tenant user: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'User creation failed');
      }

      console.log('CentralizedEmailService: Tenant user created successfully:', data.user_id);
      return { success: true, data };

    } catch (error) {
      console.error('CentralizedEmailService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tenant user'
      };
    }
  }

  /**
   * Get email templates for a tenant
   */
  static async getEmailTemplates(tenantId?: string): Promise<ServiceResult<EmailTemplate[]>> {
    try {
      let query = supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_type', { ascending: true });

      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('CentralizedEmailService: Failed to fetch templates:', error);
        throw new Error(`Failed to fetch email templates: ${error.message}`);
      }

      return { success: true, data: data || [] };

    } catch (error) {
      console.error('CentralizedEmailService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch email templates'
      };
    }
  }

  /**
   * Create or update email template
   */
  static async upsertEmailTemplate(template: Partial<EmailTemplate>): Promise<ServiceResult<EmailTemplate>> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .upsert(template, {
          onConflict: 'tenant_id,template_type'
        })
        .select()
        .single();

      if (error) {
        console.error('CentralizedEmailService: Failed to upsert template:', error);
        throw new Error(`Failed to save email template: ${error.message}`);
      }

      return { success: true, data };

    } catch (error) {
      console.error('CentralizedEmailService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save email template'
      };
    }
  }

  /**
   * Get email logs for a tenant
   */
  static async getEmailLogs(tenantId: string, limit = 50): Promise<ServiceResult<EmailLog[]>> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('CentralizedEmailService: Failed to fetch email logs:', error);
        throw new Error(`Failed to fetch email logs: ${error.message}`);
      }

      return { success: true, data: data || [] };

    } catch (error) {
      console.error('CentralizedEmailService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch email logs'
      };
    }
  }

  /**
   * Get user invitations
   */
  static async getUserInvitations(tenantId?: string): Promise<ServiceResult<UserInvitation[]>> {
    try {
      let query = supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('CentralizedEmailService: Failed to fetch invitations:', error);
        throw new Error(`Failed to fetch user invitations: ${error.message}`);
      }

      return { success: true, data: data || [] };

    } catch (error) {
      console.error('CentralizedEmailService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user invitations'
      };
    }
  }

  /**
   * Validate invitation token
   */
  static async validateInvitationToken(token: string): Promise<ServiceResult<{
    invitation_id: string;
    tenant_id: string;
    email: string;
    invitation_type: string;
    is_valid: boolean;
    expires_at: string;
  }>> {
    try {
      const { data, error } = await supabase.rpc('validate_invitation_token', { token });

      if (error) {
        console.error('CentralizedEmailService: Failed to validate token:', error);
        throw new Error(`Failed to validate invitation token: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired invitation token'
        };
      }

      return { success: true, data: data[0] };

    } catch (error) {
      console.error('CentralizedEmailService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate invitation token'
      };
    }
  }

  /**
   * Mark invitation as clicked
   */
  static async markInvitationClicked(token: string): Promise<ServiceResult<boolean>> {
    try {
      const { data, error } = await supabase.rpc('mark_invitation_clicked', { token });

      if (error) {
        console.error('CentralizedEmailService: Failed to mark clicked:', error);
        throw new Error(`Failed to mark invitation as clicked: ${error.message}`);
      }

      return { success: true, data: !!data };

    } catch (error) {
      console.error('CentralizedEmailService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark invitation as clicked'
      };
    }
  }

  /**
   * Mark invitation as accepted
   */
  static async markInvitationAccepted(token: string): Promise<ServiceResult<boolean>> {
    try {
      const { data, error } = await supabase.rpc('mark_invitation_accepted', { token });

      if (error) {
        console.error('CentralizedEmailService: Failed to mark accepted:', error);
        throw new Error(`Failed to mark invitation as accepted: ${error.message}`);
      }

      return { success: true, data: !!data };

    } catch (error) {
      console.error('CentralizedEmailService: Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark invitation as accepted'
      };
    }
  }

  /**
   * Send activation email for lead conversion
   */
  static async sendLeadActivationEmail(
    leadId: string,
    tenantId: string,
    email: string,
    fullName: string
  ): Promise<ServiceResult<{ user_id: string; invitation_token: string; email_sent: boolean }>> {
    return this.createTenantUser({
      tenantId,
      email,
      fullName,
      leadId,
      role: 'tenant_admin',
      sendActivationEmail: true
    });
  }
}
