-- Seed Invite Email Templates for Admin and User Invitations

-- Insert admin_invite template
INSERT INTO email_templates (
  template_type,
  template_name,
  category,
  preview_text,
  subject_template,
  variables,
  html_template,
  text_template,
  is_default,
  is_active,
  tenant_id
) VALUES (
  'admin_invite',
  'Admin Invitation - Professional',
  'Invitations',
  'You''ve been invited to join as an administrator',
  'Admin Invitation - {{app_name}}',
  ARRAY['app_name', 'user_name', 'invite_url', 'company_name', 'primary_color', 'role', 'organization_name'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, {{primary_color}} 0%, {{primary_color}}dd 100%); border-radius: 12px 12px 0 0;">
              <div style="font-size: 56px; margin-bottom: 16px;">👤</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Admin Invitation</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #333333; font-size: 16px; line-height: 1.6;">Hello,</p>
              
              <p style="margin: 0 0 24px; color: #666666; font-size: 16px; line-height: 1.6;">
                You''ve been invited to join <strong>{{organization_name}}</strong> as an administrator with the role of <strong>{{role}}</strong>.
              </p>
              
              <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; margin-bottom: 32px; border-left: 4px solid {{primary_color}};">
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 16px; font-weight: 600;">Your Role</h3>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  As an admin, you''ll have access to manage the platform, users, and key administrative functions.
                </p>
              </div>
              
              <p style="margin: 0 0 32px; color: #666666; font-size: 16px; line-height: 1.6;">
                Click the button below to accept the invitation and create your account:
              </p>
              
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: {{primary_color}};">
                    <a href="{{invite_url}}" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Accept Invitation & Create Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                This invitation link will expire in 24 hours. If you didn''t expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
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
</html>',
  'Hello,

You''ve been invited to join {{organization_name}} as an administrator with the role of {{role}}.

Accept your invitation and create your account:
{{invite_url}}

This invitation link will expire in 24 hours.

Best regards,
The {{company_name}} Team',
  true,
  true,
  NULL
);

-- Insert user_invite template
INSERT INTO email_templates (
  template_type,
  template_name,
  category,
  preview_text,
  subject_template,
  variables,
  html_template,
  text_template,
  is_default,
  is_active,
  tenant_id
) VALUES (
  'user_invite',
  'Team Member Invitation - Branded',
  'Invitations',
  'Join your team on {{app_name}}',
  'You''re invited to join {{tenant_name}} on {{app_name}}',
  ARRAY['app_name', 'user_name', 'invite_url', 'company_name', 'primary_color', 'role', 'tenant_name', 'inviter_name'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 48px 40px; text-align: center; background: linear-gradient(135deg, {{primary_color}} 0%, {{primary_color}}cc 100%); border-radius: 12px 12px 0 0;">
              <div style="font-size: 64px; margin-bottom: 16px;">🤝</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Team Invitation</h1>
              <p style="margin: 12px 0 0; color: #ffffffdd; font-size: 16px;">Join {{tenant_name}}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #333333; font-size: 16px; line-height: 1.6;">Hello,</p>
              
              <p style="margin: 0 0 24px; color: #666666; font-size: 16px; line-height: 1.6;">
                <strong>{{inviter_name}}</strong> has invited you to join <strong>{{tenant_name}}</strong> on {{app_name}} as a <strong>{{role}}</strong>.
              </p>
              
              <div style="background-color: #f0fdf4; padding: 24px; border-radius: 8px; margin-bottom: 32px; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 16px; font-weight: 600;">What''s Next?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>Accept the invitation below</li>
                  <li>Create your secure account</li>
                  <li>Start collaborating with your team</li>
                </ul>
              </div>
              
              <table role="presentation" style="margin: 0 auto 32px;">
                <tr>
                  <td style="border-radius: 8px; background-color: {{primary_color}};">
                    <a href="{{invite_url}}" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6; text-align: center;">
                If the button doesn''t work, copy and paste this link:<br>
                <a href="{{invite_url}}" style="color: {{primary_color}}; text-decoration: none; word-break: break-all;">{{invite_url}}</a>
              </p>
              
              <p style="margin: 24px 0 0; color: #999999; font-size: 13px; line-height: 1.6; text-align: center;">
                This invitation expires in 7 days.
              </p>
            </td>
          </tr>
          
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
</html>',
  'Hello,

{{inviter_name}} has invited you to join {{tenant_name}} on {{app_name}} as a {{role}}.

Accept your invitation:
{{invite_url}}

This invitation expires in 7 days.

Best regards,
The {{company_name}} Team',
  true,
  true,
  NULL
);

-- Insert tenant_admin_invite template
INSERT INTO email_templates (
  template_type,
  template_name,
  category,
  preview_text,
  subject_template,
  variables,
  html_template,
  text_template,
  is_default,
  is_active,
  tenant_id
) VALUES (
  'tenant_admin_invite',
  'Tenant Admin Invitation - Executive',
  'Invitations',
  'You''ve been invited as a tenant administrator',
  'Tenant Admin Invitation - {{app_name}}',
  ARRAY['app_name', 'user_name', 'invite_url', 'company_name', 'primary_color', 'role', 'tenant_name', 'inviter_name'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tenant Admin Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td align="center" style="padding: 40px 40px 0;">
              <div style="display: inline-block; padding: 8px 16px; background-color: #dbeafe; border-radius: 20px; color: #1e40af; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                🎖️ Administrator Access
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: 700;">Tenant Admin Invitation</h1>
              <p style="margin: 12px 0 0; color: #666666; font-size: 16px;">{{tenant_name}}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 16px; color: #333333; font-size: 16px; line-height: 1.6;">Hello,</p>
              
              <p style="margin: 0 0 24px; color: #666666; font-size: 16px; line-height: 1.6;">
                You''ve been invited by <strong>{{inviter_name}}</strong> to join as a <strong>Tenant Administrator</strong> for <strong>{{tenant_name}}</strong>.
              </p>
              
              <div style="background-color: #eff6ff; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px; color: #1f2937; font-size: 16px; font-weight: 600;">Admin Privileges Include:</h3>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      ✓ Manage tenant users and roles
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      ✓ Configure tenant settings and branding
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      ✓ Access analytics and reports
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      ✓ Manage subscriptions and billing
                    </td>
                  </tr>
                </table>
              </div>
              
              <table role="presentation" style="margin: 0 auto 32px;">
                <tr>
                  <td style="border-radius: 8px; background-color: {{primary_color}};">
                    <a href="{{invite_url}}" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Accept Admin Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 24px;">
                <p style="margin: 0; color: #991b1b; font-size: 13px; line-height: 1.6;">
                  <strong>Important:</strong> As a tenant administrator, you will have significant control over {{tenant_name}}. Please keep your credentials secure.
                </p>
              </div>
              
              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.6; text-align: center;">
                This invitation expires in 7 days. If you didn''t expect this invitation, please contact support.
              </p>
            </td>
          </tr>
          
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
</html>',
  'Hello,

You''ve been invited by {{inviter_name}} to join as a Tenant Administrator for {{tenant_name}}.

Admin Privileges Include:
- Manage tenant users and roles
- Configure tenant settings and branding
- Access analytics and reports
- Manage subscriptions and billing

Accept your admin invitation:
{{invite_url}}

This invitation expires in 7 days.

Best regards,
The {{company_name}} Team',
  true,
  true,
  NULL
);