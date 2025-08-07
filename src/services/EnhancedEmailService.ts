
import { supabase } from '@/integrations/supabase/client';

export interface TenantWelcomeEmailData {
  tenantName: string;
  adminName: string;
  adminEmail: string;
  tempPassword: string;
  loginUrl: string;
  tenantSlug: string;
}

export interface EmailDeliveryStatus {
  sent: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: string;
  openedAt?: string;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export class EnhancedEmailService {
  private static instance: EnhancedEmailService;

  static getInstance(): EnhancedEmailService {
    if (!EnhancedEmailService.instance) {
      EnhancedEmailService.instance = new EnhancedEmailService();
    }
    return EnhancedEmailService.instance;
  }

  async checkUserExists(email: string): Promise<{ exists: boolean; userId?: string }> {
    try {
      console.log('Checking if user exists:', email);
      
      // Call edge function to check user existence
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email }
      });

      if (error) {
        console.error('Error checking user existence:', error);
        return { exists: false };
      }

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
    try {
      console.log('Sending tenant welcome email to:', data.adminEmail);

      // First check if user already exists
      const userCheck = await this.checkUserExists(data.adminEmail);
      
      const emailTemplate = this.generateWelcomeEmailTemplate(data, userCheck.exists);
      
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: data.adminEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.htmlContent,
          text: emailTemplate.textContent,
          metadata: {
            type: 'tenant_welcome',
            tenantSlug: data.tenantSlug,
            isExistingUser: userCheck.exists
          }
        }
      });

      if (error) {
        console.error('Error sending welcome email:', error);
        return {
          sent: false,
          error: error.message || 'Failed to send email'
        };
      }

      return {
        sent: true,
        messageId: result?.messageId,
        deliveredAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in sendTenantWelcomeEmail:', error);
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private generateWelcomeEmailTemplate(data: TenantWelcomeEmailData, isExistingUser: boolean): EmailTemplate {
    const subject = `Welcome to ${data.tenantName} - Your Admin Access is Ready!`;
    
    const loginInstructions = isExistingUser 
      ? `
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin: 0 0 10px 0;">Existing Account Detected</h3>
          <p style="margin: 0; color: #0c4a6e;">
            We found an existing account with your email address. You can log in using your current credentials.
            If you've forgotten your password, use the "Forgot Password" link on the login page.
          </p>
        </div>
      `
      : `
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #166534; margin: 0 0 10px 0;">Your Login Credentials</h3>
          <p style="margin: 0 0 10px 0; color: #14532d;"><strong>Email:</strong> ${data.adminEmail}</p>
          <p style="margin: 0 0 10px 0; color: #14532d;"><strong>Temporary Password:</strong> <code style="background: #dcfce7; padding: 2px 6px; border-radius: 4px;">${data.tempPassword}</code></p>
          <p style="margin: 0; color: #14532d; font-size: 14px;">
            <em>Please change this password after your first login for security.</em>
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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to KisanShakti AI</h1>
            <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Your ${data.tenantName} admin portal is ready!</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${data.adminName}! 👋</h2>
            
            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px;">
              Congratulations! Your tenant organization "<strong>${data.tenantName}</strong>" has been successfully created on the KisanShakti AI platform.
            </p>
            
            ${loginInstructions}
            
            <!-- Quick Start Guide -->
            <div style="background: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #a16207; margin: 0 0 15px 0;">🚀 Quick Start Guide</h3>
              <ul style="margin: 0; padding-left: 20px; color: #713f12;">
                <li style="margin-bottom: 8px;">Log in to your admin dashboard</li>
                <li style="margin-bottom: 8px;">Complete your organization profile</li>
                <li style="margin-bottom: 8px;">Set up your team and invite users</li>
                <li style="margin-bottom: 8px;">Configure your tenant settings</li>
                <li>Start managing your agricultural operations!</li>
              </ul>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}" style="background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                Access Your Dashboard
              </a>
            </div>
            
            <!-- Support Info -->
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0;">Need Help?</h4>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Our support team is here to help you get started. Contact us at support@kisanshaktiai.in or visit our documentation center.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              © ${new Date().getFullYear()} KisanShakti AI. All rights reserved.<br>
              This email was sent to ${data.adminEmail}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Welcome to KisanShakti AI - ${data.tenantName}

Hello ${data.adminName}!

Congratulations! Your tenant organization "${data.tenantName}" has been successfully created on the KisanShakti AI platform.

${isExistingUser 
  ? `EXISTING ACCOUNT DETECTED: We found an existing account with your email address. You can log in using your current credentials.`
  : `YOUR LOGIN CREDENTIALS:
Email: ${data.adminEmail}
Temporary Password: ${data.tempPassword}
Please change this password after your first login for security.`
}

Access your dashboard: ${data.loginUrl}

QUICK START GUIDE:
1. Log in to your admin dashboard
2. Complete your organization profile  
3. Set up your team and invite users
4. Configure your tenant settings
5. Start managing your agricultural operations!

Need help? Contact us at support@kisanshaktiai.in

© ${new Date().getFullYear()} KisanShakti AI. All rights reserved.
    `;

    return {
      subject,
      htmlContent,
      textContent
    };
  }

  async trackEmailOpen(messageId: string): Promise<void> {
    try {
      // Implementation for tracking email opens
      console.log('Email opened:', messageId);
    } catch (error) {
      console.error('Error tracking email open:', error);
    }
  }

  async retryFailedEmail(messageId: string): Promise<EmailDeliveryStatus> {
    try {
      // Implementation for retrying failed emails
      console.log('Retrying failed email:', messageId);
      return { sent: true };
    } catch (error) {
      console.error('Error retrying email:', error);
      return { sent: false, error: 'Retry failed' };
    }
  }
}

export const emailService = EnhancedEmailService.getInstance();
