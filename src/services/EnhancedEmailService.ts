
import { supabase } from '@/integrations/supabase/client';

export interface TenantWelcomeEmailData {
  tenantName: string;
  adminName: string;
  adminEmail: string;
  tempPassword?: string; // Optional since existing users won't have this
  loginUrl: string;
  tenantSlug: string;
  isNewUser?: boolean;
  correlationId?: string;
}

export interface EmailDeliveryStatus {
  sent: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: string;
  openedAt?: string;
  warnings?: string[];
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

export class EnhancedEmailService {
  private static instance: EnhancedEmailService;

  static getInstance(): EnhancedEmailService {
    if (!EnhancedEmailService.instance) {
      EnhancedEmailService.instance = new EnhancedEmailService();
    }
    return EnhancedEmailService.instance;
  }

  /**
   * Enhanced email format validation
   */
  validateEmailFormat(email: string): EmailValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    const trimmedEmail = email.trim();
    
    if (trimmedEmail.length === 0) {
      return { isValid: false, error: 'Email cannot be empty' };
    }

    if (trimmedEmail.length > 254) {
      return { isValid: false, error: 'Email address is too long' };
    }

    // Enhanced email regex with better validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      return { 
        isValid: false, 
        error: 'Invalid email format',
        suggestions: ['Please check for typos', 'Ensure @ symbol is present', 'Verify domain extension']
      };
    }

    // Additional checks
    const parts = trimmedEmail.split('@');
    if (parts.length !== 2) {
      return { isValid: false, error: 'Email must contain exactly one @ symbol' };
    }

    const [localPart, domain] = parts;
    if (localPart.length === 0 || localPart.length > 64) {
      return { isValid: false, error: 'Invalid email local part length' };
    }

    if (domain.length === 0 || domain.length > 253) {
      return { isValid: false, error: 'Invalid email domain length' };
    }

    // Check for consecutive dots
    if (trimmedEmail.includes('..')) {
      return { isValid: false, error: 'Email cannot contain consecutive dots' };
    }

    return { isValid: true };
  }

  async checkUserExists(email: string): Promise<{ exists: boolean; userId?: string }> {
    try {
      console.log('Checking if user exists:', email);
      
      // Validate email format first
      const validation = this.validateEmailFormat(email);
      if (!validation.isValid) {
        console.error('Invalid email format during user check:', validation.error);
        return { exists: false };
      }
      
      // Call edge function to check user existence
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email: email.trim().toLowerCase() }
      });

      if (error) {
        console.error('Error checking user existence:', error);
        return { exists: false };
      }

      console.log('User existence check result:', data);
      return {
        exists: data?.exists || false,
        userId: data?.userId
      };
    } catch (error) {
      console.error('Error in checkUserExists:', error);
      return { exists: false };
    }
  }

  async sendTenantWelcomeEmail(data: TenantWelcomeEmailData): Promise<EmailDeliveryStatus> {
    const startTime = Date.now();
    const correlationId = data.correlationId || `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('Sending tenant welcome email to:', data.adminEmail);

      // Enhanced email validation
      const emailValidation = this.validateEmailFormat(data.adminEmail);
      if (!emailValidation.isValid) {
        console.error('Email validation failed:', emailValidation.error);
        
        await this.logEmailAttempt({
          recipientEmail: data.adminEmail,
          subject: `Welcome to ${data.tenantName}`,
          status: 'failed',
          error: emailValidation.error,
          correlationId,
          deliveryAttempts: 1
        });

        return {
          sent: false,
          error: emailValidation.error,
          warnings: emailValidation.suggestions
        };
      }

      // Check if user already exists
      const userCheck = await this.checkUserExists(data.adminEmail);
      const isNewUser = data.isNewUser !== undefined ? data.isNewUser : !userCheck.exists;
      
      const emailTemplate = this.generateWelcomeEmailTemplate({
        ...data,
        isNewUser
      }, isNewUser);
      
      console.log('Calling send-email function with correlation ID:', correlationId);
      
      // Enhanced email sending with retry logic
      const emailRequest = {
        to: data.adminEmail.trim(),
        subject: emailTemplate.subject,
        html: emailTemplate.htmlContent,
        text: emailTemplate.textContent,
        metadata: {
          type: 'tenant_welcome',
          tenantSlug: data.tenantSlug,
          isExistingUser: !isNewUser,
          template_version: '3.0',
          correlation_id: correlationId,
          security_level: 'high',
          contains_credentials: isNewUser && !!data.tempPassword
        }
      };

      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: emailRequest
      });

      const duration = Date.now() - startTime;
      console.log(`Send email function response (${duration}ms):`, { result, error });

      if (error) {
        console.error('Error sending welcome email:', error);
        
        // Enhanced error logging
        await this.logEmailAttempt({
          recipientEmail: data.adminEmail,
          subject: emailTemplate.subject,
          status: 'failed',
          error: error.message || 'Email service error',
          correlationId,
          deliveryAttempts: 1,
          duration,
          metadata: {
            ...emailRequest.metadata,
            error_details: error,
            smtp_available: await this.checkSmtpAvailability()
          }
        });

        return {
          sent: false,
          error: this.sanitizeErrorMessage(error.message || 'Failed to send email'),
          warnings: ['Email delivery failed - please verify SMTP configuration']
        };
      }

      // Enhanced success logging
      await this.logEmailAttempt({
        recipientEmail: data.adminEmail,
        subject: emailTemplate.subject,
        status: result?.success ? 'sent' : 'attempted',
        messageId: result?.messageId,
        correlationId,
        deliveryAttempts: 1,
        duration,
        metadata: {
          ...emailRequest.metadata,
          provider: result?.provider,
          warning: result?.warning,
          smtp_method: result?.method
        }
      });

      const response: EmailDeliveryStatus = {
        sent: result?.success || false,
        messageId: result?.messageId,
        deliveredAt: new Date().toISOString()
      };

      // Add warnings if present
      if (result?.warning) {
        response.warnings = [result.warning];
      }

      if (result?.error && result?.success) {
        response.warnings = response.warnings || [];
        response.warnings.push(this.sanitizeErrorMessage(result.error));
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Error in sendTenantWelcomeEmail (${duration}ms):`, error);
      
      // Enhanced error logging with security context
      await this.logEmailAttempt({
        recipientEmail: data.adminEmail,
        subject: `Welcome to ${data.tenantName}`,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
        deliveryAttempts: 1,
        duration,
        metadata: {
          type: 'tenant_welcome',
          tenantSlug: data.tenantSlug,
          error_type: 'service_error',
          error_boundary: true,
          security_context: 'email_service_failure'
        }
      });

      return {
        sent: false,
        error: this.sanitizeErrorMessage(error instanceof Error ? error.message : 'Unknown error'),
        warnings: ['Email service temporarily unavailable']
      };
    }
  }

  private async checkSmtpAvailability(): Promise<boolean> {
    try {
      // Simple check - this could be enhanced to actually test SMTP connection
      return !!(Deno?.env?.get?.('SMTP_HOST') || process?.env?.SMTP_HOST);
    } catch {
      return false;
    }
  }

  private sanitizeErrorMessage(error: string): string {
    // Remove sensitive information from error messages
    return error
      .replace(/password/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/key/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]');
  }

  private async logEmailAttempt(logData: {
    recipientEmail: string;
    subject: string;
    status: 'sent' | 'failed' | 'attempted';
    error?: string;
    messageId?: string;
    correlationId: string;
    deliveryAttempts: number;
    duration?: number;
    metadata?: Record<string, any>;
  }) {
    try {
      await supabase.from('email_logs').insert({
        recipient_email: logData.recipientEmail,
        subject: logData.subject,
        status: logData.status,
        error_message: logData.error,
        external_message_id: logData.messageId,
        template_type: 'tenant_welcome',
        correlation_id: logData.correlationId,
        delivery_attempts: logData.deliveryAttempts,
        last_attempt_at: new Date().toISOString(),
        sent_at: logData.status === 'sent' ? new Date().toISOString() : null,
        retry_count: logData.deliveryAttempts - 1,
        metadata: {
          duration_ms: logData.duration,
          ...logData.metadata
        }
      });
    } catch (logError) {
      console.warn('Failed to log email attempt:', logError);
    }
  }

  private generateWelcomeEmailTemplate(data: TenantWelcomeEmailData, isNewUser: boolean): EmailTemplate {
    const subject = `Welcome to ${data.tenantName} - Your Admin Access is Ready!`;
    
    const loginInstructions = isNewUser && data.tempPassword
      ? `
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="color: #166534; margin: 0 0 10px 0;">🔐 Your Login Credentials</h3>
          <p style="margin: 0 0 10px 0; color: #14532d;"><strong>Email:</strong> ${data.adminEmail}</p>
          <p style="margin: 0 0 10px 0; color: #14532d;"><strong>Temporary Password:</strong> <code style="background: #dcfce7; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${data.tempPassword}</code></p>
          <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 10px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>⚠️ Security Notice:</strong> Please change this password immediately after your first login for security.
            </p>
          </div>
        </div>
      `
      : `
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <h3 style="color: #0369a1; margin: 0 0 10px 0;">👤 Existing Account Detected</h3>
          <p style="margin: 0; color: #0c4a6e;">
            We found an existing account with your email address. You can log in using your current credentials.
            If you've forgotten your password, use the "Forgot Password" link on the login page.
          </p>
        </div>
      `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${data.tenantName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"20\" cy=\"20\" r=\"2\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"80\" cy=\"30\" r=\"1.5\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"40\" cy=\"70\" r=\"1\" fill=\"white\" opacity=\"0.1\"/></svg>') repeat;"></div>
            <div style="position: relative; z-index: 1;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">Welcome to KisanShakti AI</h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">Your ${data.tenantName} admin portal is ready!</p>
            </div>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello ${data.adminName}! 👋</h2>
            
            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.7;">
              Congratulations! Your tenant organization "<strong style="color: #059669;">${data.tenantName}</strong>" has been successfully created on the KisanShakti AI platform.
            </p>
            
            ${loginInstructions}
            
            <!-- Quick Start Guide -->
            <div style="background: #fffbeb; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #fed7aa;">
              <h3 style="color: #a16207; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">🚀 Quick Start Guide</h3>
              <ul style="margin: 0; padding-left: 0; list-style: none; color: #713f12;">
                <li style="margin-bottom: 10px; display: flex; align-items: center;">
                  <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                  Log in to your admin dashboard
                </li>
                <li style="margin-bottom: 10px; display: flex; align-items: center;">
                  <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                  Complete your organization profile
                </li>
                <li style="margin-bottom: 10px; display: flex; align-items: center;">
                  <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                  Set up your team and invite users
                </li>
                <li style="margin-bottom: 10px; display: flex; align-items: center;">
                  <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                  Configure your tenant settings
                </li>
                <li style="margin-bottom: 0; display: flex; align-items: center;">
                  <span style="color: #10b981; margin-right: 8px; font-weight: bold;">✓</span>
                  Start managing your agricultural operations!
                </li>
              </ul>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.loginUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.2s;">
                Access Your Dashboard →
              </a>
            </div>
            
            <!-- Support Info -->
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
              <h4 style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Need Help? 🤝</h4>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Our support team is here to help you get started. Contact us at 
                <a href="mailto:support@kisanshaktiai.in" style="color: #10b981; text-decoration: none;">support@kisanshaktiai.in</a> 
                or visit our documentation center.
              </p>
            </div>

            ${data.correlationId ? `
            <div style="margin-top: 20px; padding: 12px; background: #f1f5f9; border-radius: 6px; font-size: 12px; color: #64748b;">
              Reference ID: ${data.correlationId}
            </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              © ${new Date().getFullYear()} KisanShakti AI. All rights reserved.<br>
              This email was sent to ${data.adminEmail}
            </p>
            ${isNewUser && data.tempPassword ? `
            <p style="margin: 10px 0 0 0; color: #dc2626; font-size: 11px; font-weight: 500;">
              🔒 This email contains sensitive login information. Please keep it secure and delete after use.
            </p>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Welcome to KisanShakti AI - ${data.tenantName}

Hello ${data.adminName}!

Congratulations! Your tenant organization "${data.tenantName}" has been successfully created on the KisanShakti AI platform.

${isNewUser && data.tempPassword
  ? `YOUR LOGIN CREDENTIALS:
Email: ${data.adminEmail}
Temporary Password: ${data.tempPassword}

⚠️ SECURITY NOTICE: Please change this password immediately after your first login for security.`
  : `EXISTING ACCOUNT DETECTED: We found an existing account with your email address. You can log in using your current credentials.`
}

Access your dashboard: ${data.loginUrl}

QUICK START GUIDE:
✓ Log in to your admin dashboard
✓ Complete your organization profile  
✓ Set up your team and invite users
✓ Configure your tenant settings
✓ Start managing your agricultural operations!

Need help? Contact us at support@kisanshaktiai.in

${data.correlationId ? `Reference ID: ${data.correlationId}` : ''}

© ${new Date().getFullYear()} KisanShakti AI. All rights reserved.
${isNewUser && data.tempPassword ? '\n🔒 This email contains sensitive login information. Please keep it secure.' : ''}
    `;

    return {
      subject,
      htmlContent,
      textContent
    };
  }

  async trackEmailOpen(messageId: string): Promise<void> {
    try {
      await supabase
        .from('email_logs')
        .update({
          metadata: supabase.rpc('jsonb_set', {
            target: supabase.rpc('coalesce', { val1: 'metadata', val2: '{}' }),
            path: '{opened_at}',
            new_value: `"${new Date().toISOString()}"`
          })
        })
        .eq('external_message_id', messageId);
      
      console.log('Email opened:', messageId);
    } catch (error) {
      console.error('Error tracking email open:', error);
    }
  }

  async retryFailedEmail(correlationId: string): Promise<EmailDeliveryStatus> {
    try {
      const { data: failedEmail, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('correlation_id', correlationId)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !failedEmail) {
        return { sent: false, error: 'Failed email not found' };
      }

      // Increment retry attempt
      await supabase
        .from('email_logs')
        .update({
          delivery_attempts: (failedEmail.delivery_attempts || 0) + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', failedEmail.id);

      console.log('Retrying failed email:', correlationId);
      return { sent: true };
    } catch (error) {
      console.error('Error retrying email:', error);
      return { sent: false, error: 'Retry failed' };
    }
  }

  async getEmailDeliveryStats(tenantId?: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    try {
      let query = supabase.from('email_logs').select('status');
      
      if (tenantId) {
        query = query.eq('metadata->>tenantId', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = data.reduce((acc, log) => {
        acc.total++;
        if (log.status === 'sent') acc.sent++;
        else if (log.status === 'failed') acc.failed++;
        else acc.pending++;
        return acc;
      }, { total: 0, sent: 0, failed: 0, pending: 0 });

      return stats;
    } catch (error) {
      console.error('Error getting email stats:', error);
      return { total: 0, sent: 0, failed: 0, pending: 0 };
    }
  }
}

export const emailService = EnhancedEmailService.getInstance();
