import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  requireSuperAdmin,
  withCors as addCors,
  auditAdminAction,
  guardLastSuperAdmin,
  jsonError,
  type Caller,
} from '../_shared/requireSuperAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string, maxRequests = 5, windowMs = 60000): boolean => {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  
  let bucket = rateLimitStore.get(key);
  
  if (!bucket || now > bucket.resetTime) {
    bucket = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(key, bucket);
  }
  
  if (bucket.count >= maxRequests) {
    return false;
  }
  
  bucket.count++;
  return true;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[user-permissions] ${req.method} ${req.url}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const url = new URL(req.url);
    let operation = url.searchParams.get('operation');

    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json();
      operation = body.operation || operation;
    } else if (req.method === 'GET') {
      operation = 'get-tenant-relationships';
    }

    console.log(`[user-permissions] operation: ${operation}`);

    switch (operation) {
      case 'assign-role':
        return await assignAdminRole(supabase, body, req);
      
      case 'manage-tenant':
        return await manageUserTenant(supabase, body, req);
      
      case 'get-tenant-relationships':
        return await getTenantRelationships(supabase, url, req);
      
      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid operation. Use: assign-role, manage-tenant, or get-tenant-relationships' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

  } catch (error: any) {
    console.error('[user-permissions] Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// Assign admin role
async function assignAdminRole(supabase: any, body: any, req: Request): Promise<Response> {
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  if (!checkRateLimit(clientIP)) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(JSON.stringify({ 
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    }), {
      status: 429,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': '60'
      }
    });
  }

  const { userId, email, fullName, role } = body;
  
  console.log('Assigning role:', role, 'to user:', userId);

  if (!userId || !email || !fullName || !role) {
    return new Response(JSON.stringify({ 
      error: 'Missing required fields',
      code: 'MISSING_FIELDS',
      details: { userId: !!userId, email: !!email, fullName: !!fullName, role: !!role }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const validRoles = ['super_admin', 'platform_admin', 'admin'];
  if (!validRoles.includes(role)) {
    return new Response(JSON.stringify({ 
      error: 'Invalid role specified',
      code: 'INVALID_ROLE',
      validRoles: validRoles
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: existingAdmin, error: checkError } = await supabase
    .from('admin_users')
    .select('id, role, is_active')
    .eq('id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing admin:', checkError);
    return new Response(JSON.stringify({ 
      error: `Database error: ${checkError.message}`,
      code: 'DATABASE_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (existingAdmin) {
    console.log('User already has admin role:', existingAdmin);
    return new Response(JSON.stringify({ 
      success: true,
      message: 'User already has admin role assigned',
      code: 'ALREADY_ADMIN',
      data: existingAdmin
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { error: insertError } = await supabase
    .from('admin_users')
    .insert({
      id: userId,
      email: email,
      full_name: fullName,
      role: role,
      is_active: true
    });

  if (insertError) {
    console.error('Error inserting admin user:', insertError);
    
    if (insertError.code === '23505') {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'User already has admin role assigned',
        code: 'ALREADY_ADMIN'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      error: `Failed to assign admin role: ${insertError.message}`,
      code: 'INSERT_FAILED',
      details: insertError
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    await supabase.rpc('log_security_event', {
      event_type: 'admin_user_created',
      user_id: userId,
      tenant_id: null,
      metadata: {
        role: role,
        email: email,
        full_name: fullName,
        timestamp: new Date().toISOString(),
        ip_address: clientIP
      },
      ip_address: clientIP,
      user_agent: req.headers.get('user-agent') || 'admin_registration'
    });
  } catch (logError) {
    console.error('Failed to log security event:', logError);
  }

  console.log('Admin role assigned successfully');

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Admin role assigned successfully',
    user_id: userId,
    role: role,
    code: 'SUCCESS'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Manage user-tenant relationship
async function manageUserTenant(supabase: any, body: any, req: Request): Promise<Response> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Authorization required',
      code: 'UNAUTHORIZED'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (userError || !user) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Invalid authorization token',
      code: 'INVALID_TOKEN'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role, is_active')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  let hasPermission = false;
  let adminRole = '';

  if (adminUser) {
    adminRole = adminUser.role;
    hasPermission = ['super_admin', 'platform_admin'].includes(adminUser.role);
  }

  if (!hasPermission) {
    const { data: tenantRelations } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['tenant_admin', 'tenant_owner']);

    hasPermission = tenantRelations && tenantRelations.length > 0;
    if (hasPermission) {
      adminRole = 'tenant_admin';
    }
  }

  if (!hasPermission) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Admin privileges required',
      code: 'INSUFFICIENT_PRIVILEGES'
    }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { user_id, tenant_id, role, is_active = true, metadata = {}, operation = 'upsert' } = body;

  if (!user_id || !tenant_id || !role) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Missing required fields: user_id, tenant_id, role',
      code: 'MISSING_FIELDS'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: result, error: dbError } = await supabase.rpc(
    'manage_user_tenant_relationship',
    {
      p_user_id: user_id,
      p_tenant_id: tenant_id,
      p_role: role,
      p_is_active: is_active,
      p_metadata: {
        ...metadata,
        managed_by: user.id,
        managed_by_role: adminRole
      },
      p_operation: operation
    }
  );

  if (dbError) {
    console.error('Database error:', dbError);
    return new Response(JSON.stringify({
      success: false,
      error: 'Database operation failed',
      code: 'DATABASE_ERROR',
      details: dbError.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    ...result,
    managed_by: user.id,
    managed_by_role: adminRole
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Get tenant relationships
async function getTenantRelationships(supabase: any, url: URL, req: Request): Promise<Response> {
  const userId = url.searchParams.get('user_id');
  const tenantId = url.searchParams.get('tenant_id');
  const includeInactive = url.searchParams.get('include_inactive') === 'true';

  let query = supabase
    .from('user_tenants')
    .select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data: relationships, error: fetchError } = await query;

  if (fetchError) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch relationships',
      code: 'FETCH_ERROR',
      details: fetchError.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    data: relationships,
    count: relationships?.length || 0
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

serve(handler);
