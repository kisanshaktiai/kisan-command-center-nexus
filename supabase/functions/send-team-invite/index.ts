
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = "https://qfklkkzxemsbeniyugiz.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface TeamInviteRequest {
  tenantId: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: string;
  tenantName?: string;
  inviterName?: string;
  userId: string; // Admin user ID
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Service Role Key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const rawBody = await req.text();
    const body: TeamInviteRequest = JSON.parse(rawBody);

    const { tenantId, email, firstName, lastName, role, tenantName, inviterName, userId } = body;

    if (!tenantId || !email || !firstName || !role || !userId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid userId format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verify tenant exists
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenantData) {
      return new Response(JSON.stringify({ success: false, error: 'Tenant does not exist' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verify admin user has permission
    const { data: adminUser, error: adminError } = await supabase
      .from('user_tenants')
      .select('user_id, role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .in('role', ['tenant_owner', 'tenant_admin'])
      .single();

    if (adminError || !adminUser) {
      return new Response(JSON.stringify({ success: false, error: 'User not authorized to send invitations' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Check for duplicate active invitations
    const { data: existingInvites } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase().trim())
      .in('status', ['pending', 'sent']);

    if (existingInvites && existingInvites.length > 0) {
      return new Response(JSON.stringify({ success: false, error: 'Active invitation already exists for this email' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomUUID();

    // Prepare invitation data
    const invitationData = {
      tenant_id: tenantId,
      email: email.toLowerCase().trim(),
      first_name: firstName,
      last_name: lastName || '',
      role,
      invitation_token: invitationToken,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invited_by: userId,
      inviter_name: inviterName,
      tenant_name: tenantName || tenantData.name,
      metadata: {
        invitation_source: 'team_management',
        tenant_name: tenantName || tenantData.name,
        inviter_name: inviterName
      }
    };

    // Insert team invitation
    const { data: invitation, error: insertError } = await supabase
      .from('team_invitations')
      .insert(invitationData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create team invitation:', insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Return success response
    const siteUrl = Deno.env.get('SITE_URL') || 'https://your-app.com';
    return new Response(JSON.stringify({
      success: true,
      invitationId: invitation.id,
      inviteUrl: `${siteUrl}/accept-team-invitation?token=${invitationToken}`,
      message: 'Team invitation sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (err) {
    console.error('Team invitation error:', err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
