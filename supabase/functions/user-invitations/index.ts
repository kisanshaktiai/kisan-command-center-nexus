import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= INLINED VALIDATION LOGIC (from validate-user-invitation) =============

interface ValidationRequest {
  email: string;
  tenantId?: string;
  invitationType: 'admin' | 'user';
  role: string;
}

interface ValidationResponse {
  isValid: boolean;
  exists: boolean;
  userId?: string;
  issues: string[];
  existingRoles: {
    isAdmin: boolean;
    isTenantUser: boolean;
    tenantIds: string[];
  };
  pendingInvites: {
    hasAdminInvite: boolean;
    hasUserInvite: boolean;
    tenantIds: string[];
  };
  normalizedEmail: string;
}

/**
 * Enhanced email validation with regex and disposable email detection
 */
function validateEmailFormat(email: string): { isValid: boolean; error?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  
  if (!normalizedEmail || normalizedEmail.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  // Enhanced RFC 5322 compliant email regex
  const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
  
  if (!emailRegex.test(normalizedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (normalizedEmail.length > 255) {
    return { isValid: false, error: 'Email address is too long (max 255 characters)' };
  }
  
  const disposableDomains = [
    'tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'trashmail.com', 'fakeinbox.com', 'temp-mail.org'
  ];
  
  const domain = normalizedEmail.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return { isValid: false, error: 'Disposable email addresses are not allowed' };
  }
  
  return { isValid: true };
}

/**
 * Comprehensive validation function (inlined from validate-user-invitation)
 */
async function validateInvitation(
  supabase: any,
  request: ValidationRequest
): Promise<ValidationResponse> {
  const issues: string[] = [];
  const normalizedEmail = request.email.toLowerCase().trim();
  
  console.log('[user-invitations:validate] Validating:', {
    email: normalizedEmail,
    type: request.invitationType,
    tenantId: request.tenantId
  });
  
  // Step 1: Email format validation
  const emailValidation = validateEmailFormat(request.email);
  if (!emailValidation.isValid) {
    issues.push(emailValidation.error!);
    return {
      isValid: false,
      exists: false,
      issues,
      existingRoles: { isAdmin: false, isTenantUser: false, tenantIds: [] },
      pendingInvites: { hasAdminInvite: false, hasUserInvite: false, tenantIds: [] },
      normalizedEmail
    };
  }
  
  // Step 2: Check auth.users for existing user using Auth Admin API
  let userId: string | undefined;
  let exists = false;
  
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('[user-invitations:validate] Error checking auth.users:', authError);
    } else if (authData?.users) {
      const authUser = authData.users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
      userId = authUser?.id;
      exists = !!authUser;
    }
  } catch (error) {
    console.error('[user-invitations:validate] Exception checking auth users:', error);
  }
  
  console.log('[user-invitations:validate] Auth user check:', { exists, userId });
  
  // Step 3: Check admin_users table
  let isAdmin = false;
  if (exists && userId) {
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', userId)
      .eq('is_active', true)
      .single();
    
    isAdmin = !!adminUser;
    console.log('[user-invitations:validate] Admin check:', { isAdmin });
  }
  
  // Step 4: Check user_tenants for tenant relationships
  const tenantIds: string[] = [];
  let isTenantUser = false;
  
  if (exists && userId) {
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (userTenants && userTenants.length > 0) {
      isTenantUser = true;
      tenantIds.push(...userTenants.map((ut: any) => ut.tenant_id));
    }
    
    console.log('[user-invitations:validate] Tenant relationships:', { count: tenantIds.length });
  }
  
  // Step 5: Check pending admin invitations
  const { data: adminInvites } = await supabase
    .from('admin_invites')
    .select('id, status, expires_at')
    .eq('email', normalizedEmail)
    .in('status', ['pending', 'sent']);
  
  const hasActiveAdminInvite = adminInvites && adminInvites.length > 0 && 
    adminInvites.some((invite: any) => new Date(invite.expires_at) > new Date());
  
  console.log('[user-invitations:validate] Admin invites:', { 
    count: adminInvites?.length || 0,
    hasActive: hasActiveAdminInvite 
  });
  
  // Step 6: Check pending user invitations
  const { data: userInvites } = await supabase
    .from('user_invitations')
    .select('id, tenant_id, status, expires_at')
    .eq('email', normalizedEmail)
    .in('status', ['pending', 'sent']);
  
  const activeUserInvites = userInvites?.filter((invite: any) => 
    new Date(invite.expires_at) > new Date()
  ) || [];
  
  const userInviteTenantIds = activeUserInvites.map((invite: any) => invite.tenant_id);
  const hasActiveUserInvite = activeUserInvites.length > 0;
  
  console.log('[user-invitations:validate] User invites:', { 
    count: activeUserInvites.length,
    tenants: userInviteTenantIds 
  });
  
  // Step 7: Validation rules based on invitation type
  if (request.invitationType === 'admin') {
    if (exists) {
      issues.push('This email already has an account. Admin invites are only for new users.');
    }
    if (hasActiveAdminInvite) {
      issues.push('An active admin invitation already exists for this email');
    }
    if (isTenantUser) {
      issues.push('This email is already associated with a tenant. Cannot invite as admin.');
    }
  } else {
    if (!request.tenantId) {
      issues.push('Tenant ID is required for user invitations');
    }
    if (isAdmin) {
      issues.push('This email belongs to an admin user. Cannot invite as a team member.');
    }
    if (hasActiveAdminInvite) {
      issues.push('This email has a pending admin invitation. Cannot invite as a team member.');
    }
    if (request.tenantId && tenantIds.includes(request.tenantId)) {
      issues.push('User is already a member of this tenant');
    }
    if (request.tenantId && userInviteTenantIds.includes(request.tenantId)) {
      issues.push('An active invitation already exists for this email in this tenant');
    }
  }
  
  const isValid = issues.length === 0;
  
  console.log('[user-invitations:validate] Validation result:', { 
    isValid, 
    issuesCount: issues.length 
  });
  
  return {
    isValid,
    exists,
    userId,
    issues,
    existingRoles: {
      isAdmin,
      isTenantUser,
      tenantIds
    },
    pendingInvites: {
      hasAdminInvite: hasActiveAdminInvite,
      hasUserInvite: hasActiveUserInvite,
      tenantIds: userInviteTenantIds
    },
    normalizedEmail
  };
}

// ============= MAIN HANDLER =============

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
      
      case 'validate':
        // New action: direct validation endpoint
        return await handleValidate(supabase, body);
      
      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action. Use: send, verify, accept, or validate' 
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

// Handle direct validation requests (replacement for validate-user-invitation function)
async function handleValidate(supabase: any, body: any): Promise<Response> {
  const { email, tenantId, invitationType, role } = body;
  
  if (!email || !invitationType || !role) {
    return new Response(JSON.stringify({
      isValid: false,
      exists: false,
      issues: ['Missing required fields: email, invitationType, and role are required'],
      existingRoles: { isAdmin: false, isTenantUser: false, tenantIds: [] },
      pendingInvites: { hasAdminInvite: false, hasUserInvite: false, tenantIds: [] },
      normalizedEmail: email || ''
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  const result = await validateInvitation(supabase, { email, tenantId, invitationType, role });
  
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

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

  // Comprehensive validation using inlined function (no external call)
  console.log('[sendAdminInvite] Validating invitation for:', email);
  const validation = await validateInvitation(supabase, {
    email,
    invitationType: 'admin',
    role
  });

  if (!validation.isValid) {
    console.log('[sendAdminInvite] Validation failed:', validation.issues);
    return new Response(JSON.stringify({ 
      error: validation.issues.join('; '),
      validationDetails: validation
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const normalizedEmail = validation.normalizedEmail;
  const inviteToken = generateInviteToken();

  const { data: invite, error: inviteError } = await supabase
    .from('admin_invites')
    .insert({
      email: normalizedEmail,
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
      email: normalizedEmail,
      redirectTo: inviteUrl,
      metadata: {
        app_name: organizationName,
        company_name: organizationName,
        primary_color: primaryColor,
        role: role,
        organization_name: organizationName,
        invite_url: inviteUrl,
        user_name: normalizedEmail.split('@')[0]
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

  // Comprehensive validation using inlined function (no external call)
  console.log('[sendUserInvite] Validating invitation for:', email, 'tenant:', tenantId);
  const validation = await validateInvitation(supabase, {
    email,
    tenantId,
    invitationType: 'user',
    role
  });

  if (!validation.isValid) {
    console.log('[sendUserInvite] Validation failed:', validation.issues);
    return new Response(JSON.stringify({ 
      success: false, 
      error: validation.issues.join('; '),
      validationDetails: validation
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const normalizedEmail = validation.normalizedEmail;

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

  // Check authorization: either super_admin/platform_admin OR user_tenants record
  let isAuthorized = false;
  
  // First check if user is a super_admin or platform_admin
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', userId)
    .eq('is_active', true)
    .single();
  
  if (adminUser && ['super_admin', 'platform_admin'].includes(adminUser.role)) {
    console.log('[sendUserInvite] User is authorized as admin:', adminUser.role);
    isAuthorized = true;
  }
  
  // If not admin, check user_tenants
  if (!isAuthorized) {
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('id, role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();
    
    if (userTenant) {
      console.log('[sendUserInvite] User is authorized via user_tenants:', userTenant.role);
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    console.log('[sendUserInvite] User not authorized. userId:', userId, 'tenantId:', tenantId);
    return new Response(JSON.stringify({ success: false, error: 'User not authorized to invite for this tenant' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const invitationToken = crypto.randomUUID();

  const invitationData = {
    tenant_id: tenantId,
    email: normalizedEmail,
    first_name: firstName,
    last_name: lastName || '',
    role: role,
    invitation_token: invitationToken,
    invitation_type: 'admin_invite',
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
      email: normalizedEmail,
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

  const isValid = invite.status === 'pending' || invite.status === 'sent';
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

  const isValid = (invite.status === 'pending' || invite.status === 'sent') && 
                  new Date(invite.expires_at) > new Date();

  if (!isValid) {
    return new Response(JSON.stringify({
      error: invite.status === 'accepted' ? 'Invite has already been used' : 'Invite has expired'
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
