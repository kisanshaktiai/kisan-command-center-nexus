// --- unchanged imports ---
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
  tenantName?: string;
  inviterName?: string;
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
      tenantName = 'KisanShakti Platform',
      inviterName = 'Admin'
    }: InviteUserRequest = await req.json();

    console.log('Processing user invitation:', { tenantId, email, role, firstName, lastName });

    if (!tenantId || !email || !firstName || !role) {
      throw new Error('Missing required fields: tenantId, email, firstName, role');
    }

    // Get current user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication check failed:', authError);
      throw new Error('Authentication required to send invitations');
    }

    console.log('Authenticated user:', user.id, user.email);

    const invitationToken = crypto.randomUUID();

    // ✅ FIXED: use actual table columns, not just metadata
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase().trim(),
        created_by: user.id,
        invitation_type: 'onboarding',
        status: 'pending',
        invitation_token: invitationToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        first_name: firstName,
        last_name: lastName || '',
        role,
        tenant_name: tenantName,
        inviter_name: inviterName
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return new Response(
        JSON.stringify({ success: false, error: inviteError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Invitation created successfully:', invitation.id);

    const inviteUrl = `${Deno.env.get('SITE_URL')}/auth?invite=${invitationToken}`;

    const emailResponse = await resend.emails.send({
      from: "KisanShakti <admin@kisanshaktiai.in>",
      to: [email],
      subject: `You're invited to join ${tenantName}`,
      html: `...your full email template stays unchanged...`
    });

    if (emailResponse.error) {
      console.error('Error sending email:', emailResponse.error);
      await supabase
        .from('user_invitations')
        .update({ 
          status: 'failed',
          metadata: { emailError: emailResponse.error.message }
        })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    await supabase
      .from('user_invitations')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invitation.id);

    console.log('User invitation sent successfully:', emailResponse.data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitation.id,
        email_id: emailResponse.data?.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in send-user-invite function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
