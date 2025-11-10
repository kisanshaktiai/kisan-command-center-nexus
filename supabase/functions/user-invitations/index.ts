import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateInviteToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[user-invitations] ${req.method} ${req.url}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    let invitationType = url.searchParams.get('invitation_type') || 'admin';

    // Handle body data for POST requests
    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json();
      action = body.action || action;
      invitationType = body.invitation_type || invitationType;
    }

    console.log(`[user-invitations] action: ${action}, type: ${invitationType}`);

    // Route to appropriate handler
    switch (action) {
      case 'send':
        return invitationType === 'admin' 
          ? await sendAdminInvite(supabase, body) 
          : await sendUserInvite(supabase, body);
      
      case 'verify':
        return await verifyInvite(supabase, url, invitationType);
      
      case 'accept':
        return await acceptInvite(supabase, body, invitationType);
      
      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action. Use: send, verify, or accept' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

  } catch (error: any) {
    console.error('[user-invitations] Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// Send admin invitation
async function sendAdminInvite(supabase: any, body: any): Promise<Response> {
  const {
    email,
    role,
    invitedBy,
    organizationName = 'KisanShaktiAI',
    appLogo,
    primaryColor = '#2563eb'
  } = body;

  if (!email || !role || !invitedBy) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields: email, role, invitedBy' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const validRoles = ['admin', 'platform_admin', 'super_admin'];
  if (!validRoles.includes(role)) {
    return new Response(JSON.stringify({ 
      error: 'Invalid role. Must be admin, platform_admin, or super_admin' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const inviteToken = generateInviteToken();

  const { data: existingInvite } = await supabase
    .from('admin_invites')
    .select('id, status')
    .eq('email', email)
    .eq('status', 'pending')
    .gte('expires_at', new Date().toISOString())
    .single();

  if (existingInvite) {
    return new Response(JSON.stringify({ 
      error: 'User already has a pending invite' 
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { data: invite, error: inviteError } = await supabase
    .from('admin_invites')
    .insert({
      email,
      role,
      invite_token: inviteToken,
      invited_by: invitedBy,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: { organizationName, appLogo, primaryColor }
    })
    .select()
    .single();

  if (inviteError) {
    throw new Error(`Failed to create invite: ${inviteError.message}`);
  }

  const siteUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com') || 'https://app.kisanshaktiai.in';
  const inviteUrl = `${siteUrl}/register?invite=${inviteToken}`;

  // Call send-auth-email function instead of using Resend directly
  const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-auth-email', {
    body: {
      type: 'admin_invite',
      email: email,
      redirectTo: inviteUrl,
      metadata: {
        app_name: organizationName,
        company_name: organizationName,
        primary_color: primaryColor,
        role: role,
        organization_name: organizationName,
        invite_url: inviteUrl,
        user_name: email.split('@')[0]
      }
    }
  });

  if (emailError) {
    console.error('Failed to send email:', emailError);
    await supabase.from('admin_invites').delete().eq('id', invite.id);
    throw new Error(`Failed to send email: ${emailError.message}`);
  }

  console.log('Admin invite email sent:', emailResult);

  return new Response(JSON.stringify({
    success: true,
    inviteId: invite.id,
    message: 'Admin invitation sent successfully',
    emailId: emailResult?.messageId
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// Send user invitation
async function sendUserInvite(supabase: any, body: any): Promise<Response> {
  const { tenantId, email, firstName, lastName, role, tenantName, inviterName, userId } = body;

  if (!tenantId || !email || !firstName || !role || !userId) {
    return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId) || !uuidRegex.test(tenantId)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid ID format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

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

  const { data: userTenant, error: userTenantError } = await supabase
    .from('user_tenants')
    .select('id, role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single();

  if (userTenantError || !userTenant) {
    return new Response(JSON.stringify({ success: false, error: 'User not authorized to invite for this tenant' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const { data: existingInvites } = await supabase
    .from('user_invitations')
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

  const invitationToken = crypto.randomUUID();

  const invitationData = {
    tenant_id: tenantId,
    email: email.toLowerCase().trim(),
    first_name: firstName,
    last_name: lastName || '',
    role: role,
    invitation_token: invitationToken,
    invitation_type: 'team_member',
    status: 'sent',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: userId,
    inviter_name: inviterName || 'Team Admin',
    tenant_name: tenantName || tenantData.name,
    metadata: {
      invitation_source: 'onboarding'
    },
    sent_at: new Date().toISOString()
  };

  const { data: invitation, error: insertError } = await supabase
    .from('user_invitations')
    .insert(invitationData)
    .select('id')
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ success: false, error: insertError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com') || 'https://app.kisanshaktiai.in';
  const inviteUrl = `${siteUrl}/accept-invitation?token=${invitationToken}`;

  // Fetch tenant branding for white-label support
  const { data: whiteLabelConfig } = await supabase
    .from('white_label_configs')
    .select('brand_identity')
    .eq('tenant_id', tenantId)
    .single();

  const brandIdentity = whiteLabelConfig?.brand_identity || {};

  // Call send-auth-email function
  const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-auth-email', {
    body: {
      type: 'user_invite',
      email: email,
      tenantId: tenantId,
      redirectTo: inviteUrl,
      metadata: {
        app_name: brandIdentity.app_name || 'KisanShaktiAI',
        company_name: brandIdentity.company_name || 'KisanShaktiAI',
        primary_color: brandIdentity.primary_color || '#6366f1',
        role: role,
        tenant_name: tenantName || tenantData.name,
        inviter_name: inviterName || 'Team Admin',
        invite_url: inviteUrl,
        user_name: firstName
      }
    }
  });

  if (emailError) {
    console.error('Failed to send user invite email:', emailError);
    // Don't delete the invitation, just log the error
    console.warn('Invitation created but email failed to send');
  }

  console.log('User invite email sent:', emailResult);

  return new Response(JSON.stringify({
    success: true,
    invitation_id: invitation.id,
    inviteUrl: inviteUrl,
    message: 'Invitation sent successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

// Verify invite
async function verifyInvite(supabase: any, url: URL, invitationType: string): Promise<Response> {
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing invite token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const table = invitationType === 'admin' ? 'admin_invites' : 'user_invitations';
  const tokenField = invitationType === 'admin' ? 'invite_token' : 'invitation_token';

  const { data: invite, error } = await supabase
    .from(table)
    .select('*')
    .eq(tokenField, token)
    .single();

  if (error || !invite) {
    return new Response(JSON.stringify({
      valid: false,
      error: 'Invalid invite token'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const statusField = invitationType === 'admin' ? 'status' : 'status';
  const isValid = invite[statusField] === 'pending' || invite[statusField] === 'sent';
  const notExpired = new Date(invite.expires_at) > new Date();

  if (!isValid || !notExpired) {
    return new Response(JSON.stringify({
      valid: false,
      error: !isValid ? 'Invite has already been used' : 'Invite has expired'
    }), {
      status: 410,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({
    valid: true,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expires_at,
    metadata: invite.metadata || {}
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// Accept invite
async function acceptInvite(supabase: any, body: any, invitationType: string): Promise<Response> {
  const { token, fullName, password, phone } = body;

  if (!token || !fullName || !password) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields: token, fullName, password' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const table = invitationType === 'admin' ? 'admin_invites' : 'user_invitations';
  const tokenField = invitationType === 'admin' ? 'invite_token' : 'invitation_token';

  const { data: invite, error: validateError } = await supabase
    .from(table)
    .select('*')
    .eq(tokenField, token)
    .single();

  if (validateError || !invite) {
    return new Response(JSON.stringify({ error: 'Invalid invite token' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const statusField = invitationType === 'admin' ? 'status' : 'status';
  const isValid = (invite[statusField] === 'pending' || invite[statusField] === 'sent') && 
                  new Date(invite.expires_at) > new Date();

  if (!isValid) {
    return new Response(JSON.stringify({
      error: invite[statusField] === 'accepted' ? 'Invite has already been used' : 'Invite has expired'
    }), {
      status: 410,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone: phone || '',
      invite_role: invite.role
    }
  });

  if (userError) {
    throw new Error(`Failed to create user: ${userError.message}`);
  }

  if (invitationType === 'admin') {
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert({
        id: userData.user.id,
        email: invite.email,
        full_name: fullName,
        role: invite.role,
        is_active: true
      });

    if (adminError) {
      await supabase.auth.admin.deleteUser(userData.user.id);
      throw new Error(`Failed to create admin user: ${adminError.message}`);
    }
  }

  await supabase
    .from(table)
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq(tokenField, token);

  return new Response(JSON.stringify({
    success: true,
    message: `${invitationType === 'admin' ? 'Admin' : 'User'} account created successfully`,
    user: {
      id: userData.user.id,
      email: userData.user.email,
      role: invite.role
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

serve(handler);
