
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailTemplateData {
  tenantName?: string;
  tenantLogo?: string;
  primaryColor?: string;
  organizationName?: string;
  userFullName?: string;
  verificationUrl?: string;
  resetUrl?: string;
}

const getEmailTemplate = (type: 'verification' | 'password_reset', data: EmailTemplateData) => {
  const baseStyle = `
    <style>
      .email-container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; }
      .header { background: linear-gradient(135deg, ${data.primaryColor || '#2563eb'} 0%, ${data.primaryColor || '#1d4ed8'} 100%); padding: 30px; text-align: center; }
      .logo { max-height: 60px; margin-bottom: 20px; }
      .title { color: white; font-size: 24px; font-weight: bold; margin: 0; }
      .content { padding: 40px 30px; background: white; }
      .button { display: inline-block; background: ${data.primaryColor || '#2563eb'}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
      .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
  `;

  if (type === 'verification') {
    return `
      ${baseStyle}
      <div class="email-container">
        <div class="header">
          ${data.tenantLogo ? `<img src="${data.tenantLogo}" alt="${data.tenantName}" class="logo">` : ''}
          <h1 class="title">Welcome to ${data.tenantName || 'KisanShaktiAI'}</h1>
        </div>
        <div class="content">
          <h2>Hi ${data.userFullName || 'there'},</h2>
          <p>Thank you for joining ${data.organizationName || 'our platform'}! We're excited to have you on board.</p>
          <p>To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
          </div>
          <p>This verification link will expire in 24 hours for security reasons.</p>
          <p>If you didn't create this account, you can safely ignore this email.</p>
          <p>Best regards,<br>The ${data.tenantName || 'KisanShaktiAI'} Team</p>
        </div>
        <div class="footer">
          <p>This email was sent to verify your account registration.</p>
          <p>© ${new Date().getFullYear()} ${data.tenantName || 'KisanShaktiAI'}. All rights reserved.</p>
        </div>
      </div>
    `;
  } else {
    return `
      ${baseStyle}
      <div class="email-container">
        <div class="header">
          ${data.tenantLogo ? `<img src="${data.tenantLogo}" alt="${data.tenantName}" class="logo">` : ''}
          <h1 class="title">Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hi ${data.userFullName || 'there'},</h2>
          <p>We received a request to reset your password for your ${data.tenantName || 'KisanShaktiAI'} account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center;">
            <a href="${data.resetUrl}" class="button">Reset Password</a>
          </div>
          <p>This reset link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          <p>Best regards,<br>The ${data.tenantName || 'KisanShaktiAI'} Team</p>
        </div>
        <div class="footer">
          <p>For security, this link will expire soon. If you need help, contact our support team.</p>
          <p>© ${new Date().getFullYear()} ${data.tenantName || 'KisanShaktiAI'}. All rights reserved.</p>
        </div>
      </div>
    `;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { 
      to, 
      type, 
      templateData 
    }: { 
      to: string; 
      type: 'verification' | 'password_reset'; 
      templateData: EmailTemplateData;
    } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    
    const emailTemplate = getEmailTemplate(type, templateData);
    const subject = type === 'verification' 
      ? `Verify your ${templateData.tenantName || 'KisanShaktiAI'} account`
      : `Reset your ${templateData.tenantName || 'KisanShaktiAI'} password`;

    const result = await resend.emails.send({
      from: `${templateData.tenantName || 'KisanShaktiAI'} <noreply@kisanshakti.in>`,
      to: [to],
      subject: subject,
      html: emailTemplate,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: result.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending auth email:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to send email" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
