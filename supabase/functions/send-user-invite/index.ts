
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = "https://qfklkkzxemsbeniyugiz.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface InviteRequest {
  tenantId: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: string;
  tenantName?: string;
  inviterName?: string;
  userId: string;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('send-user-invite: Starting invitation process');
    
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error('send-user-invite: Service Role Key not configured');
      return new Response(JSON.stringify({ success: false, error: 'Service Role Key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const rawBody = await req.text();
    const body: InviteRequest = JSON.parse(rawBody);
    console.log('send-user-invite: Request body parsed', { 
      tenantId: body.tenantId, 
      email: body.email, 
      role: body.role 
    });

    const { tenantId, email, firstName, lastName, role, tenantName, inviterName, userId } = body;

    if (!tenantId || !email || !firstName || !role || !userId) {
      console.error('send-user-invite: Missing required fields');
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId) || !uuidRegex.test(tenantId)) {
      console.error('send-user-invite: Invalid UUID format');
      return new Response(JSON.stringify({ success: false, error: 'Invalid ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('send-user-invite: Invalid email format');
      return new Response(JSON.stringify({ success: false, error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verify tenant exists
    console.log('send-user-invite: Verifying tenant exists');
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenantData) {
      console.error('send-user-invite: Tenant verification failed', tenantError);
      return new Response(JSON.stringify({ success: false, error: 'Tenant does not exist' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verify the user is authorized to invite (has tenant access)
    console.log('send-user-invite: Verifying user authorization');
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('id, role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (userTenantError || !userTenant) {
      console.error('send-user-invite: User not authorized for this tenant', userTenantError);
      return new Response(JSON.stringify({ success: false, error: 'User not authorized to invite for this tenant' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Check for existing active invitation
    console.log('send-user-invite: Checking for existing invitations');
    const { data: existingInvites } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase().trim())
      .in('status', ['pending', 'sent']);

    if (existingInvites && existingInvites.length > 0) {
      console.log('send-user-invite: Active invitation already exists');
      return new Response(JSON.stringify({ success: false, error: 'Active invitation already exists for this email' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomUUID();
    console.log('send-user-invite: Generated invitation token');

    // Prepare invitation data with metadata in the correct format
    const invitationData = {
      tenant_id: tenantId,
      email: email.toLowerCase().trim(),
      invited_name: `${firstName} ${lastName || ''}`.trim(),
      role: role,
      invitation_token: invitationToken,
      invitation_type: 'team_member',
      status: 'sent',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: userId,
      metadata: {
        first_name: firstName,
        last_name: lastName || '',
        role: role,
        invitation_source: 'onboarding',
        tenant_name: tenantName || tenantData.name,
        inviter_name: inviterName || 'Team Admin'
      },
      sent_at: new Date().toISOString()
    };

    // Insert invitation
    console.log('send-user-invite: Creating invitation record');
    const { data: invitation, error: insertError } = await supabase
      .from('user_invitations')
      .insert(invitationData)
      .select('id')
      .single();

    if (insertError) {
      console.error('send-user-invite: Failed to create invitation', insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('send-user-invite: Invitation created successfully', invitation.id);
    
    // Return success response
    const siteUrl = Deno.env.get('SITE_URL') || 'https://your-app.com';
    return new Response(JSON.stringify({
      success: true,
      invitation_id: invitation.id,
      inviteUrl: `${siteUrl}/accept-invitation?token=${invitationToken}`,
      message: 'Invitation sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (err) {
    console.error('send-user-invite: Unexpected error', err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
