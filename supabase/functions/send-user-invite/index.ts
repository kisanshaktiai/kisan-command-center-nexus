
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteUserRequest {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantName: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const {
      tenantId,
      email,
      firstName,
      lastName,
      role,
      tenantName,
      inviterName
    }: InviteUserRequest = await req.json();

    console.log('Processing user invitation:', { tenantId, email, role });

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .insert({
        tenant_id: tenantId,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        invitation_type: 'onboarding',
        status: 'pending',
        invited_by: req.headers.get('user-id') || null
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    // Send invitation email
    const inviteUrl = `${Deno.env.get('SITE_URL')}/auth?invite=${invitation.invitation_token}`;
    
    const emailResponse = await resend.emails.send({
      from: "KisanShakti <noreply@kisanshakti.com>",
      to: [email],
      subject: `You're invited to join ${tenantName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Join ${tenantName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: #6b7280; }
            .btn { display: inline-block; background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .btn:hover { background: #15803d; }
            .role-badge { background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌾 Welcome to KisanShakti</h1>
              <p>You've been invited to join ${tenantName}</p>
            </div>
            <div class="content">
              <p>Hello ${firstName},</p>
              <p><strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on the KisanShakti platform.</p>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #166534;">Your Role:</h3>
                <span class="role-badge">${role.replace('_', ' ').toUpperCase()}</span>
              </div>

              <p>As a ${role.replace('_', ' ')}, you'll have access to:</p>
              <ul>
                <li>Agricultural management tools</li>
                <li>Real-time weather and crop insights</li>
                <li>Community collaboration features</li>
                <li>Performance analytics and reporting</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" class="btn">Accept Invitation</a>
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                This invitation will expire in 7 days. If you don't have an account, one will be created for you when you accept the invitation.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 KisanShakti. Empowering agriculture through technology.</p>
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error('Error sending email:', emailResponse.error);
      throw new Error(`Failed to send invitation email: ${emailResponse.error.message}`);
    }

    // Update invitation status
    await supabase
      .from('user_invitations')
      .update({ 
        status: 'sent', 
        sent_at: new Date().toISOString() 
      })
      .eq('id', invitation.id);

    console.log('User invitation sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitation.id,
        email_id: emailResponse.data?.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in send-user-invite function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);
