import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Trim and lowercase
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check basic format
  if (!normalizedEmail || normalizedEmail.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  // Enhanced RFC 5322 compliant email regex
  const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
  
  if (!emailRegex.test(normalizedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  // Check length constraints
  if (normalizedEmail.length > 255) {
    return { isValid: false, error: 'Email address is too long (max 255 characters)' };
  }
  
  // Check for common disposable email domains
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
 * Comprehensive validation function
 */
async function validateInvitation(
  supabase: any,
  request: ValidationRequest
): Promise<ValidationResponse> {
  const issues: string[] = [];
  const normalizedEmail = request.email.toLowerCase().trim();
  
  console.log('[validate-user-invitation] Validating:', {
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
  
  // Step 2: Check auth.users for existing user
  const { data: authUser, error: authError } = await supabase
    .from('auth.users')
    .select('id, email, email_confirmed_at, created_at')
    .eq('email', normalizedEmail)
    .maybeSingle();
  
  if (authError) {
    console.error('[validate-user-invitation] Error checking auth.users:', authError);
  }
  
  const userId = authUser?.id;
  const exists = !!authUser;
  
  console.log('[validate-user-invitation] Auth user check:', { exists, userId });
  
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
    console.log('[validate-user-invitation] Admin check:', { isAdmin });
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
    
    console.log('[validate-user-invitation] Tenant relationships:', { count: tenantIds.length });
  }
  
  // Step 5: Check pending admin invitations
  const { data: adminInvites } = await supabase
    .from('admin_invites')
    .select('id, status, expires_at')
    .eq('email', normalizedEmail)
    .in('status', ['pending', 'sent']);
  
  const hasActiveAdminInvite = adminInvites && adminInvites.length > 0 && 
    adminInvites.some((invite: any) => new Date(invite.expires_at) > new Date());
  
  console.log('[validate-user-invitation] Admin invites:', { 
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
  
  console.log('[validate-user-invitation] User invites:', { 
    count: activeUserInvites.length,
    tenants: userInviteTenantIds 
  });
  
  // Step 7: Validation rules based on invitation type
  if (request.invitationType === 'admin') {
    // Admin invitation validation
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
    // User invitation validation
    if (!request.tenantId) {
      issues.push('Tenant ID is required for user invitations');
    }
    
    if (isAdmin) {
      issues.push('This email belongs to an admin user. Cannot invite as a team member.');
    }
    
    if (hasActiveAdminInvite) {
      issues.push('This email has a pending admin invitation. Cannot invite as a team member.');
    }
    
    // Check if user already in THIS tenant
    if (request.tenantId && tenantIds.includes(request.tenantId)) {
      issues.push('User is already a member of this tenant');
    }
    
    // Check if active invitation exists for THIS tenant
    if (request.tenantId && userInviteTenantIds.includes(request.tenantId)) {
      issues.push('An active invitation already exists for this email in this tenant');
    }
  }
  
  const isValid = issues.length === 0;
  
  console.log('[validate-user-invitation] Validation result:', { 
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const request: ValidationRequest = await req.json();
    
    if (!request.email || !request.invitationType || !request.role) {
      return new Response(JSON.stringify({
        isValid: false,
        exists: false,
        issues: ['Missing required fields: email, invitationType, and role are required'],
        existingRoles: { isAdmin: false, isTenantUser: false, tenantIds: [] },
        pendingInvites: { hasAdminInvite: false, hasUserInvite: false, tenantIds: [] },
        normalizedEmail: request.email || ''
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const result = await validateInvitation(supabase, request);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error('[validate-user-invitation] Error:', error);
    return new Response(JSON.stringify({
      isValid: false,
      exists: false,
      issues: [`Validation error: ${error.message}`],
      existingRoles: { isAdmin: false, isTenantUser: false, tenantIds: [] },
      pendingInvites: { hasAdminInvite: false, hasUserInvite: false, tenantIds: [] },
      normalizedEmail: ''
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
