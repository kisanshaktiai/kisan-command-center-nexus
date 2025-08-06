import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';
import type { 
  EmailTemplate, 
  EmailLog, 
  EmailVerification,
  SendEmailRequest,
  TenantWelcomeEmailData,
  LeadConversionEmailData,
  EmailVerificationData,
  EmailStatus
} from '@/types/email';

export class EmailService extends BaseService {
  private static instance: EmailService;

  static getInstance(): EmailService {
    if (!this.instance) {
      this.instance = new EmailService();
    }
    return this.instance;
  }

  /**
   * Send tenant welcome email after tenant creation
   */
  async sendTenantWelcomeEmail(data: TenantWelcomeEmailData): Promise<ServiceResult<boolean>> {
    try {
      console.log('EmailService: Sending tenant welcome email:', data.email);

      const variables = {
        tenant_name: data.tenantName,
        user_name: data.userName,
        email: data.email,
        password: data.password,
        login_url: data.loginUrl
      };

      const result = await this.sendEmail({
        to: data.email,
        templateType: 'tenant_welcome',
        variables,
        tenantId: data.tenantId,
        recipientId: data.userId,
        metadata: { type: 'tenant_welcome', tenant_id: data.tenantId }
      });

      return result;
    } catch (error) {
      console.error('EmailService: Error sending tenant welcome email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send welcome email' 
      };
    }
  }

  /**
   * Send lead conversion email after converting lead to tenant
   */
  async sendLeadConversionEmail(data: LeadConversionEmailData): Promise<ServiceResult<boolean>> {
    try {
      console.log('EmailService: Sending lead conversion email:', data.email);

      const variables = {
        tenant_name: data.tenantName,
        user_name: data.userName,
        email: data.email,
        password: data.password,
        login_url: data.loginUrl
      };

      const result = await this.sendEmail({
        to: data.email,
        templateType: 'lead_conversion',
        variables,
        tenantId: data.tenantId,
        recipientId: data.userId,
        metadata: { 
          type: 'lead_conversion', 
          tenant_id: data.tenantId, 
          lead_id: data.leadId 
        }
      });

      return result;
    } catch (error) {
      console.error('EmailService: Error sending lead conversion email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send conversion email' 
      };
    }
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(data: EmailVerificationData): Promise<ServiceResult<string>> {
    try {
      console.log('EmailService: Sending email verification:', data.email);

      // Generate verification token
      const verificationToken = this.generateVerificationToken();
      
      // Store verification in database
      const { error: insertError } = await supabase
        .from('email_verifications')
        .insert({
          user_id: data.userId,
          tenant_id: data.tenantId,
          email: data.email,
          verification_token: verificationToken,
          verification_type: 'email_verification',
          metadata: {}
        });

      if (insertError) {
        throw new Error(`Failed to store verification: ${insertError.message}`);
      }

      const variables = {
        user_name: data.userName,
        verification_url: `${data.verificationUrl}?token=${verificationToken}`
      };

      const emailResult = await this.sendEmail({
        to: data.email,
        templateType: 'email_verification',
        variables,
        tenantId: data.tenantId,
        recipientId: data.userId,
        metadata: { 
          type: 'email_verification', 
          verification_token: verificationToken 
        }
      });

      if (!emailResult.success) {
        return { success: false, error: emailResult.error };
      }

      return { success: true, data: verificationToken };
    } catch (error) {
      console.error('EmailService: Error sending verification email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send verification email' 
      };
    }
  }

  /**
   * Generic email sending method
   */
  async sendEmail(request: SendEmailRequest): Promise<ServiceResult<boolean>> {
    let logId: string | null = null;

    try {
      // Get email template
      const template = await this.getEmailTemplate(request.templateType, request.tenantId);
      if (!template) {
        throw new Error(`Email template not found: ${request.templateType}`);
      }

      // Replace variables in template
      const subject = this.replaceVariables(template.subject_template, request.variables);
      const htmlContent = this.replaceVariables(template.html_template, request.variables);
      const textContent = template.text_template 
        ? this.replaceVariables(template.text_template, request.variables)
        : undefined;

      // Create email log entry
      const { data: logData, error: logError } = await supabase
        .from('email_logs')
        .insert({
          tenant_id: request.tenantId,
          recipient_email: request.to,
          recipient_id: request.recipientId,
          template_id: template.id,
          template_type: request.templateType,
          subject,
          status: 'pending',
          metadata: request.metadata || {},
          retry_count: 0
        })
        .select()
        .single();

      if (logError) {
        throw new Error(`Failed to create email log: ${logError.message}`);
      }

      logId = logData.id;

      // Send email via Supabase edge function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: request.to,
          subject,
          html: htmlContent,
          text: textContent,
          metadata: {
            template_type: request.templateType,
            tenant_id: request.tenantId,
            log_id: logId,
            ...request.metadata
          }
        }
      });

      if (error) {
        // Update log with error
        await this.updateEmailLogStatus(logId, 'failed', error.message);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      // Update log with success
      await this.updateEmailLogStatus(logId, 'sent', undefined, {
        external_message_id: data?.messageId,
        sent_at: new Date().toISOString()
      });

      console.log('EmailService: Email sent successfully:', request.to);
      return { success: true, data: true };

    } catch (error) {
      console.error('EmailService: Error sending email:', error);
      
      if (logId) {
        await this.updateEmailLogStatus(
          logId, 
          'failed', 
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  }

  /**
   * Get email template by type and tenant
   */
  private async getEmailTemplate(templateType: string, tenantId?: string): Promise<EmailTemplate | null> {
    try {
      if (tenantId) {
        // First try to get tenant-specific template
        const { data: tenantTemplate } = await supabase
          .from('email_templates')
          .select('*')
          .eq('template_type', templateType)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .single();

        if (tenantTemplate) {
          return tenantTemplate as EmailTemplate;
        }
      }

      // Get default template
      const { data: defaultTemplate } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_type', templateType)
        .is('tenant_id', null)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (defaultTemplate) {
        return defaultTemplate as EmailTemplate;
      }

      return null;
    } catch (error) {
      console.error('EmailService: Error fetching email template:', error);
      return null;
    }
  }

  /**
   * Replace variables in template content
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }

  /**
   * Update email log status
   */
  private async updateEmailLogStatus(
    logId: string, 
    status: EmailStatus, 
    errorMessage?: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
        updateData.failed_at = new Date().toISOString();
      }

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      await supabase
        .from('email_logs')
        .update(updateData)
        .eq('id', logId);
    } catch (error) {
      console.error('EmailService: Error updating email log:', error);
    }
  }

  /**
   * Generate secure verification token
   */
  private generateVerificationToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify email verification token
   */
  async verifyEmailToken(token: string): Promise<ServiceResult<EmailVerification>> {
    try {
      const { data, error } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('verification_token', token)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return { 
          success: false, 
          error: 'Invalid or expired verification token' 
        };
      }

      // Mark as verified
      const { error: updateError } = await supabase
        .from('email_verifications')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (updateError) {
        throw new Error(`Failed to update verification: ${updateError.message}`);
      }

      // Cast the response to match our interface
      const verification: EmailVerification = {
        ...data,
        metadata: data.metadata as Record<string, any>
      };

      return { success: true, data: verification };
    } catch (error) {
      console.error('EmailService: Error verifying token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify token' 
      };
    }
  }

  /**
   * Get email logs for a tenant
   */
  async getEmailLogs(tenantId?: string, limit = 50): Promise<ServiceResult<EmailLog[]>> {
    try {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch email logs: ${error.message}`);
      }

      // Cast the response to match our interface
      const emailLogs: EmailLog[] = (data || []).map(log => ({
        ...log,
        status: log.status as EmailStatus,
        metadata: log.metadata as Record<string, any>
      }));

      return { success: true, data: emailLogs };
    } catch (error) {
      console.error('EmailService: Error fetching email logs:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch email logs' 
      };
    }
  }
}

export const emailService = EmailService.getInstance();
