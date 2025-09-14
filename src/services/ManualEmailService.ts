
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';

export interface ManualEmailRequest {
  tenantId: string;
  emailType: 'password_reset' | 'activation_resend' | 'welcome_resend';
  adminEmail: string;
  adminName?: string;
}

export class ManualEmailService extends BaseService {
  private static instance: ManualEmailService;

  static getInstance(): ManualEmailService {
    if (!this.instance) {
      this.instance = new ManualEmailService();
    }
    return this.instance;
  }

  /**
   * Send manual password reset email to tenant admin
   */
  async sendPasswordReset(request: ManualEmailRequest): Promise<ServiceResult<boolean>> {
    try {
      console.log('ManualEmailService: Sending password reset email:', request);

      // Generate reset token
      const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
        request.adminEmail,
        {
          redirectTo: `${window.location.origin}/auth?type=recovery`
        }
      );

      if (resetError) {
        throw new Error(`Failed to send password reset: ${resetError.message}`);
      }

      // Log the email sending
      await this.logManualEmail(request, 'password_reset', 'sent');

      console.log('ManualEmailService: Password reset email sent successfully');
      return { success: true, data: true };

    } catch (error) {
      console.error('ManualEmailService: Error sending password reset:', error);
      await this.logManualEmail(request, 'password_reset', 'failed', error instanceof Error ? error.message : undefined);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send password reset email' 
      };
    }
  }

  /**
   * Resend activation/welcome email to tenant admin
   */
  async resendWelcomeEmail(request: ManualEmailRequest): Promise<ServiceResult<boolean>> {
    try {
      console.log('ManualEmailService: Resending welcome email:', request);

      // Get tenant details
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', request.tenantId)
        .single();

      if (tenantError || !tenant) {
        throw new Error('Tenant not found');
      }

      // Generate a new temporary password
      const tempPassword = this.generateTemporaryPassword();

      // Send welcome email using existing email service
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: request.adminEmail,
          subject: `Welcome to ${tenant.name} - Login Credentials`,
          html: this.generateWelcomeEmailTemplate({
            tenantName: tenant.name,
            adminName: request.adminName || 'Admin',
            adminEmail: request.adminEmail,
            tempPassword: tempPassword,
            loginUrl: `${window.location.origin}/auth`
          }),
          metadata: {
            template_type: 'tenant_welcome_resend',
            tenant_id: request.tenantId,
            manual_send: true
          }
        }
      });

      if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
      }

      // Log the email sending
      await this.logManualEmail(request, 'welcome_resend', 'sent');

      console.log('ManualEmailService: Welcome email resent successfully');
      return { success: true, data: true };

    } catch (error) {
      console.error('ManualEmailService: Error resending welcome email:', error);
      await this.logManualEmail(request, 'welcome_resend', 'failed', error instanceof Error ? error.message : undefined);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to resend welcome email' 
      };
    }
  }

  /**
   * Generate welcome email HTML template
   */
  private generateWelcomeEmailTemplate(data: {
    tenantName: string;
    adminName: string;
    adminEmail: string;
    tempPassword: string;
    loginUrl: string;
  }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; font-size: 24px; margin: 0;">Welcome to ${data.tenantName}</h1>
        </div>
        <div style="padding: 40px 30px; background: white;">
          <h2>Hi ${data.adminName},</h2>
          <p>Your ${data.tenantName} account has been set up successfully. Here are your login credentials:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${data.adminEmail}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px;">${data.tempPassword}</code></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Your Account</a>
          </div>
          <p><strong>Important:</strong> Please change your password after your first login for security reasons.</p>
          <p>Best regards,<br>The KisanShaktiAI Team</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This email contains sensitive login information. Please keep it secure.</p>
          <p>© ${new Date().getFullYear()} KisanShaktiAI. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  /**
   * Log manual email sending for audit trail
   */
  private async logManualEmail(
    request: ManualEmailRequest,
    emailType: string,
    status: 'sent' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase.from('email_logs').insert({
        tenant_id: request.tenantId,
        recipient_email: request.adminEmail,
        template_type: `manual_${emailType}`,
        subject: `Manual ${emailType} email`,
        status: status,
        error_message: errorMessage,
        metadata: {
          manual_send: true,
          requested_by: 'super_admin',
          email_type: emailType,
          timestamp: new Date().toISOString()
        },
        retry_count: 0,
        sent_at: status === 'sent' ? new Date().toISOString() : undefined,
        failed_at: status === 'failed' ? new Date().toISOString() : undefined
      });
    } catch (error) {
      console.error('Error logging manual email:', error);
      // Don't throw here to avoid blocking the main operation
    }
  }

  /**
   * Generate secure temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }
}

export const manualEmailService = ManualEmailService.getInstance();
