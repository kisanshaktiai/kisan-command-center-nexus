// World-class email templates library
export const worldClassTemplates = [
  {
    template_type: 'email_verification',
    template_name: 'Email Verification - Modern',
    category: 'Authentication',
    preview_text: 'Verify your email address to activate your account',
    subject_template: 'Verify your email for {{app_name}}',
    variables: ['app_name', 'user_name', 'verification_url', 'company_name', 'primary_color'],
    html_template: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, {{primary_color}} 0%, {{primary_color}}dd 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #333333; font-size: 16px; line-height: 1.6;">Hi {{user_name}},</p>
              
              <p style="margin: 0 0 24px; color: #666666; font-size: 16px; line-height: 1.6;">
                Thank you for signing up with <strong>{{app_name}}</strong>! We're excited to have you on board.
              </p>
              
              <p style="margin: 0 0 32px; color: #666666; font-size: 16px; line-height: 1.6;">
                Please verify your email address by clicking the button below:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: {{primary_color}};">
                    <a href="{{verification_url}}" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #666666; font-size: 14px;">
                © 2024 {{company_name}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text_template: 'Hi {{user_name}},\n\nThank you for signing up with {{app_name}}!\n\nPlease verify your email address by clicking this link:\n{{verification_url}}\n\nIf you didn\'t create an account, you can safely ignore this email.\n\nBest regards,\nThe {{company_name}} Team'
  },
  {
    template_type: 'password_reset',
    template_name: 'Password Reset - Secure',
    category: 'Authentication',
    preview_text: 'Reset your password securely',
    subject_template: 'Reset your password for {{app_name}}',
    variables: ['app_name', 'user_name', 'reset_url', 'company_name', 'primary_color', 'reset_code'],
    html_template: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Security Badge -->
          <tr>
            <td align="center" style="padding: 40px 40px 0;">
              <div style="display: inline-block; padding: 8px 16px; background-color: #fef3c7; border-radius: 20px; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                🔒 Security Alert
              </div>
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 700;">Password Reset Request</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 16px; color: #333333; font-size: 16px; line-height: 1.6;">Hi {{user_name}},</p>
              
              <p style="margin: 0 0 24px; color: #666666; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for your <strong>{{app_name}}</strong> account.
              </p>
              
              <p style="margin: 0 0 32px; color: #666666; font-size: 16px; line-height: 1.6;">
                Click the button below to reset your password:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto 32px;">
                <tr>
                  <td style="border-radius: 8px; background-color: {{primary_color}};">
                    <a href="{{reset_url}}" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Reset Code -->
              <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 32px; border: 2px dashed #e5e7eb;">
                <p style="margin: 0 0 8px; color: #666666; font-size: 14px;">Or use this code:</p>
                <p style="margin: 0; color: {{primary_color}}; font-size: 32px; font-weight: 700; letter-spacing: 4px; font-family: 'Courier New', monospace;">{{reset_code}}</p>
              </div>
              
              <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                  <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email or contact our support team immediately.
                </p>
              </div>
              
              <p style="margin: 24px 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                This link will expire in 24 hours for security reasons.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #666666; font-size: 14px;">
                © 2024 {{company_name}}. All rights reserved.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated security email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text_template: 'Hi {{user_name}},\n\nWe received a request to reset your password for your {{app_name}} account.\n\nReset your password:\n{{reset_url}}\n\nOr use this code: {{reset_code}}\n\nThis link will expire in 24 hours.\n\nIf you didn\'t request this, please contact support immediately.\n\nBest regards,\nThe {{company_name}} Team'
  },
  {
    template_type: 'welcome',
    template_name: 'Welcome Email - Onboarding',
    category: 'Onboarding',
    preview_text: 'Welcome! Let\'s get you started',
    subject_template: 'Welcome to {{app_name}}, {{user_name}}! 🎉',
    variables: ['app_name', 'user_name', 'company_name', 'primary_color', 'app_url', 'support_email'],
    html_template: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Hero Section -->
          <tr>
            <td style="padding: 48px 40px; text-align: center; background: linear-gradient(135deg, {{primary_color}} 0%, {{primary_color}}cc 100%); border-radius: 12px 12px 0 0;">
              <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">Welcome to {{app_name}}!</h1>
              <p style="margin: 12px 0 0; color: #ffffffdd; font-size: 18px;">We're thrilled to have you here, {{user_name}}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #333333; font-size: 16px; line-height: 1.6;">
                Your account is all set up and ready to go. Here's what you can do next:
              </p>
              
              <!-- Features Grid -->
              <table role="presentation" style="width: 100%; margin-bottom: 32px;">
                <tr>
                  <td style="width: 50%; padding: 16px; vertical-align: top;">
                    <div style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px; height: 100%;">
                      <div style="font-size: 40px; margin-bottom: 12px;">🚀</div>
                      <h3 style="margin: 0 0 8px; color: #1f2937; font-size: 16px; font-weight: 600;">Get Started</h3>
                      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">Complete your profile and explore features</p>
                    </div>
                  </td>
                  <td style="width: 50%; padding: 16px; vertical-align: top;">
                    <div style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px; height: 100%;">
                      <div style="font-size: 40px; margin-bottom: 12px;">📚</div>
                      <h3 style="margin: 0 0 8px; color: #1f2937; font-size: 16px; font-weight: 600;">Learn More</h3>
                      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">Check out our guides and tutorials</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="width: 50%; padding: 16px; vertical-align: top;">
                    <div style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px; height: 100%;">
                      <div style="font-size: 40px; margin-bottom: 12px;">💬</div>
                      <h3 style="margin: 0 0 8px; color: #1f2937; font-size: 16px; font-weight: 600;">Get Support</h3>
                      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">Our team is here to help anytime</p>
                    </div>
                  </td>
                  <td style="width: 50%; padding: 16px; vertical-align: top;">
                    <div style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px; height: 100%;">
                      <div style="font-size: 40px; margin-bottom: 12px;">🌟</div>
                      <h3 style="margin: 0 0 8px; color: #1f2937; font-size: 16px; font-weight: 600;">Join Community</h3>
                      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">Connect with other users</p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: {{primary_color}};">
                    <a href="{{app_url}}" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Launch Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                Need help? Contact us at <a href="mailto:{{support_email}}" style="color: {{primary_color}}; text-decoration: none;">{{support_email}}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #666666; font-size: 14px;">
                © 2024 {{company_name}}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    text_template: 'Welcome to {{app_name}}, {{user_name}}!\n\nYour account is all set up. Here\'s what you can do:\n\n- Get Started: Complete your profile\n- Learn More: Check our guides\n- Get Support: Contact our team\n- Join Community: Connect with others\n\nLaunch Dashboard: {{app_url}}\n\nNeed help? Email: {{support_email}}\n\nBest regards,\nThe {{company_name}} Team'
  }
];

// Function to seed default templates
export const getDefaultTemplates = () => worldClassTemplates;
