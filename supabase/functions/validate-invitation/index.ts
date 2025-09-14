
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateInvitationRequest {
  token: string;
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

    const { token }: ValidateInvitationRequest = await req.json();

    if (!token) {
      throw new Error('Invitation token is required');
    }

    console.log('Validating invitation token:', token);

    // Get invitation details
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (error) {
      console.error('Error fetching invitation:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid invitation token',
          valid: false
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Check if invitation is valid
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    const isExpired = now > expiresAt;
    const isAlreadyAccepted = invitation.status === 'accepted';

    const isValid = !isExpired && !isAlreadyAccepted && invitation.status === 'sent';

    console.log('Invitation validation result:', { 
      isValid, 
      isExpired, 
      isAlreadyAccepted, 
      status: invitation.status 
    });

    return new Response(
      JSON.stringify({
        success: true,
        valid: isValid,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          invited_name: invitation.invited_name,
          role: invitation.role,
          tenant_id: invitation.tenant_id,
          expires_at: invitation.expires_at,
          status: invitation.status
        },
        expired: isExpired,
        already_accepted: isAlreadyAccepted
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Error in validate-invitation function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        valid: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);
