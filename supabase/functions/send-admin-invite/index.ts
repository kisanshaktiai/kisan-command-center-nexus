import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  email: string;
  role: 'admin' | 'platform_admin' | 'super_admin';
  invitedBy: string;
  organizationName?: string;
  appLogo?: string;
  primaryColor?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const {
      email,
      role,
      invitedBy,
      organizationName = 'KisanShaktiAI',
      appLogo,
      primaryColor = '#2563eb'
    }: InviteRequest = await req.json();

    // Validate required fields
    if (!email || !role || !invitedBy) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: email, role, invitedBy' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate role
    const validRoles = ['admin', 'platform_admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid role. Must be admin, platform_admin, or super_admin' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Generate secure invite token
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_invite_token');

    if (tokenError) {
      throw new Error(`Failed to generate invite token: ${tokenError.message}`);
    }

    const inviteToken = tokenData;

    // Check if user already has a pending invite
    const { data: existingInvite } = await supabase
      .from('admin_invites')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return new Response(JSON.stringify({ 
        error: 'User already has a pending invite' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('admin_invites')
      .insert({
        email,
        role,
        invite_token: inviteToken,
        invited_by: invitedBy,
        metadata: {
          organizationName,
          appLogo,
          primaryColor
        }
      })
      .select()
      .single();

    if (inviteError) {
      throw new Error(`Failed to create invite: ${inviteError.message}`);
    }

    // Create invite link
    const inviteUrl = `${Deno.env.get('SITE_URL') || 'https://app.kisanshaktiai.in'}/register?token=${inviteToken}`;

    // Create branded email template
    const emailTemplate = `
      <style>
        .email-container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .logo { max-height: 60px; margin-bottom: 20px; }
        .title { color: white; font-size: 28px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .content { padding: 40px 30px; background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .welcome { color: #1a1a1a; font-size: 18px; margin-bottom: 24px; }
        .button { 
          display: inline-block; 
          background: ${primaryColor}; 
          color: white; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600; 
          margin: 24px 0; 
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4); }
        .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0; }
        .detail-item { margin: 8px 0; }
        .detail-label { font-weight: 600; color: #374151; }
        .detail-value { color: #6b7280; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-radius: 0 0 12px 12px; }
        .security-note { background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 24px 0; }
        .security-note h4 { color: #92400e; margin: 0 0 8px 0; font-size: 16px; }
        .security-note p { color: #92400e; margin: 0; font-size: 14px; }
      </style>
      <div class="email-container">
        <div class="header">
          ${appLogo ? `<img src="${appLogo}" alt="${organizationName}" class="logo">` : ''}
          <h1 class="title">Admin Invitation</h1>
        </div>
        <div class="content">
          <p class="welcome">You've been invited to join <strong>${organizationName}</strong> as an administrator!</p>
          
          <p>You have been granted <strong>${role.replace('_', ' ')}</strong> access to our platform. This invitation allows you to:</p>
          
          <ul style="color: #374151; line-height: 1.6;">
            <li>Access the admin dashboard</li>
            <li>Manage platform settings and users</li>
            <li>Configure system features</li>
            ${role === 'super_admin' ? '<li>Full system administration</li>' : ''}
          </ul>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" class="button">Accept Invitation & Create Account</a>
          </div>

          <div class="details">
            <div class="detail-item">
              <span class="detail-label">Email:</span> 
              <span class="detail-value">${email}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Role:</span> 
              <span class="detail-value">${role.replace('_', ' ')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Organization:</span> 
              <span class="detail-value">${organizationName}</span>
            </div>
          </div>

          <div class="security-note">
            <h4>🔒 Security Notice</h4>
            <p>This invitation link will expire in 24 hours for security reasons. If you didn't expect this invitation, please contact our support team.</p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            If the button above doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteUrl}" style="color: ${primaryColor}; word-break: break-all;">${inviteUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p><strong>${organizationName}</strong> - Empowering Agricultural Innovation</p>
          <p>© ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send email
    const emailResult = await resend.emails.send({
      from: `${organizationName} <admin@kisanshaktiai.in>`,
      to: [email],
      subject: `Admin Invitation - ${organizationName}`,
      html: emailTemplate,
    });

    if (emailResult.error) {
      // Delete the invite if email fails
      await supabase
        .from('admin_invites')
        .delete()
        .eq('id', invite.id);
      
      throw new Error(`Failed to send email: ${emailResult.error.message}`);
    }

    // Log analytics event
    await supabase
      .from('admin_invite_analytics')
      .insert({
        invite_id: invite.id,
        event_type: 'sent',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
        metadata: {
          email_id: emailResult.data?.id
        }
      });

    return new Response(JSON.stringify({
      success: true,
      inviteId: invite.id,
      message: 'Admin invitation sent successfully',
      emailId: emailResult.data?.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error sending admin invite:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to send admin invite'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);