import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RateLimiter, RATE_LIMITS } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimiter = new RateLimiter();
  const clientIP = rateLimiter.getClientIP(req);

  try {
    console.log(`[user-management] ${req.method} ${req.url}`);

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
    }

    if (!operation) {
      return new Response(JSON.stringify({ 
        error: 'Operation is required. Use: check-exists, get-by-email, register, update, deactivate, or list' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`[user-management] operation: ${operation}`);

    // Apply rate limiting based on operation
    let rateLimitConfig = RATE_LIMITS.MEDIUM;
    if (operation === 'register') {
      rateLimitConfig = RATE_LIMITS.HIGH_SENSITIVITY;
    }

    const rateLimitResult = await rateLimiter.checkLimit(
      clientIP,
      'user-management',
      rateLimitConfig
    );

    const rateLimitHeaders = rateLimiter.getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      console.warn(`[user-management] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitResult.retryAfter
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          ...rateLimitHeaders
        }
      });
    }

    switch (operation) {
      case 'check-exists':
        return await checkUserExists(supabase, body, rateLimitHeaders);
      
      case 'get-by-email':
      case 'get':
        return await getUserByEmail(supabase, body, rateLimitHeaders);
      
      case 'register':
        return await registerUser(supabase, body, rateLimitHeaders);
      
      case 'update':
        return await updateUser(supabase, body, rateLimitHeaders);
      
      case 'deactivate':
        return await deactivateUser(supabase, body, rateLimitHeaders);
      
      case 'list':
        return await listUsers(supabase, body, rateLimitHeaders);
      
      default:
        return new Response(JSON.stringify({ 
          error: `Invalid operation: ${operation}. Use: check-exists, get-by-email, register, update, deactivate, or list` 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders },
        });
    }

  } catch (error: any) {
    console.error('[user-management] Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

/**
 * Check if user exists in auth.users
 */
async function checkUserExists(supabase: any, body: any, rateLimitHeaders: any): Promise<Response> {
  const { email, user_email } = body;
  const emailToCheck = email || user_email;

  if (!emailToCheck) {
    return new Response(JSON.stringify({ 
      error: 'Email is required',
      code: 'MISSING_EMAIL'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  console.log(`[user-management] Checking if user exists: ${emailToCheck}`);

  // Get all users from auth
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('[user-management] Error fetching auth users:', authError);
    return new Response(JSON.stringify({ 
      error: 'Failed to check user existence',
      code: 'AUTH_ERROR',
      details: authError.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  const user = users.users.find((u: any) => u.email === emailToCheck);

  if (!user) {
    return new Response(JSON.stringify({ 
      exists: false,
      email: emailToCheck
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  // Check if user is an admin
  const { data: adminData, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = !adminError && adminData;

  return new Response(JSON.stringify({ 
    exists: true,
    isAdmin,
    userId: user.id,
    email: user.email,
    userStatus: user.email_confirmed_at ? 'confirmed' : 'pending',
    created_at: user.created_at
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
  });
}

/**
 * Get user by email
 */
async function getUserByEmail(supabase: any, body: any, rateLimitHeaders: any): Promise<Response> {
  const { email, user_email } = body;
  const emailToGet = email || user_email;

  if (!emailToGet) {
    return new Response(JSON.stringify({ 
      error: 'Email is required',
      code: 'MISSING_EMAIL'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  console.log(`[user-management] Getting user by email: ${emailToGet}`);

  // Get user from auth.users
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('[user-management] Error fetching users:', authError);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch user',
      code: 'AUTH_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  const user = users.users.find((u: any) => u.email === emailToGet);

  if (!user) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  return new Response(JSON.stringify([{
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    email_confirmed_at: user.email_confirmed_at,
    user_metadata: user.user_metadata
  }]), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
  });
}

/**
 * Register a new user with optional welcome email
 */
async function registerUser(supabase: any, body: any, rateLimitHeaders: any): Promise<Response> {
  const { 
    email, 
    password, 
    full_name, 
    tenant_id, 
    send_welcome_email = false,
    metadata = {} 
  } = body;

  if (!email) {
    return new Response(JSON.stringify({ 
      error: 'Email is required',
      code: 'MISSING_EMAIL'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  console.log(`[user-management] Registering user: ${email}`);

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find((u: any) => u.email === email);

  if (existingUser) {
    console.log(`[user-management] User exists, updating metadata: ${email}`);
    
    // Update user metadata
    const updateMetadata: any = { ...existingUser.user_metadata };
    if (full_name) updateMetadata.full_name = full_name;
    if (tenant_id) updateMetadata.tenant_id = tenant_id;
    Object.assign(updateMetadata, metadata);

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { user_metadata: updateMetadata }
    );

    if (updateError) {
      console.error('[user-management] Error updating user metadata:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update user',
        code: 'UPDATE_ERROR'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
      });
    }

    return new Response(JSON.stringify({ 
      status: 'updated',
      userId: existingUser.id,
      email: existingUser.email,
      isNewUser: false,
      message: 'User already exists, metadata updated'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  // Generate secure password if not provided
  const userPassword = password || generateSecurePassword();

  // Create new user
  const userMetadata: any = {};
  if (full_name) userMetadata.full_name = full_name;
  if (tenant_id) userMetadata.tenant_id = tenant_id;
  Object.assign(userMetadata, metadata);

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: userPassword,
    email_confirm: false,
    user_metadata: userMetadata
  });

  if (createError) {
    console.error('[user-management] Error creating user:', createError);
    return new Response(JSON.stringify({ 
      error: 'Failed to create user',
      code: 'CREATE_ERROR',
      details: createError.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  console.log(`[user-management] User created successfully: ${email}`);

  // Send welcome email if requested
  let emailSent = false;
  if (send_welcome_email) {
    try {
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Welcome to the Platform',
          html: `
            <h1>Welcome!</h1>
            <p>Your account has been created.</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${userPassword}</p>
            <p>Please log in and change your password.</p>
          `
        }
      });

      if (emailError) {
        console.error('[user-management] Error sending welcome email:', emailError);
      } else {
        emailSent = true;
      }
    } catch (emailError) {
      console.error('[user-management] Failed to send welcome email:', emailError);
    }
  }

  return new Response(JSON.stringify({ 
    status: 'created',
    userId: newUser.user.id,
    email: newUser.user.email,
    isNewUser: true,
    emailSent,
    tempPassword: !password ? userPassword : undefined,
    message: 'User created successfully'
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
  });
}

/**
 * Update user metadata
 */
async function updateUser(supabase: any, body: any, rateLimitHeaders: any): Promise<Response> {
  const { user_id, email, metadata } = body;

  if (!user_id && !email) {
    return new Response(JSON.stringify({ 
      error: 'User ID or email is required',
      code: 'MISSING_IDENTIFIER'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  console.log(`[user-management] Updating user: ${user_id || email}`);

  let userId = user_id;

  // If only email provided, get user ID
  if (!userId && email) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users.find((u: any) => u.email === email);
    if (!user) {
      return new Response(JSON.stringify({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
      });
    }
    userId = user.id;
  }

  // Update user metadata
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    userId,
    { user_metadata: metadata }
  );

  if (updateError) {
    console.error('[user-management] Error updating user:', updateError);
    return new Response(JSON.stringify({ 
      error: 'Failed to update user',
      code: 'UPDATE_ERROR',
      details: updateError.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  return new Response(JSON.stringify({ 
    success: true,
    userId,
    message: 'User updated successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
  });
}

/**
 * Deactivate user account
 */
async function deactivateUser(supabase: any, body: any, rateLimitHeaders: any): Promise<Response> {
  const { user_id, email } = body;

  if (!user_id && !email) {
    return new Response(JSON.stringify({ 
      error: 'User ID or email is required',
      code: 'MISSING_IDENTIFIER'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  console.log(`[user-management] Deactivating user: ${user_id || email}`);

  let userId = user_id;

  // If only email provided, get user ID
  if (!userId && email) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users.find((u: any) => u.email === email);
    if (!user) {
      return new Response(JSON.stringify({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
      });
    }
    userId = user.id;
  }

  // Delete user (soft delete in Supabase means disabling)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error('[user-management] Error deactivating user:', deleteError);
    return new Response(JSON.stringify({ 
      error: 'Failed to deactivate user',
      code: 'DEACTIVATE_ERROR',
      details: deleteError.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  return new Response(JSON.stringify({ 
    success: true,
    userId,
    message: 'User deactivated successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
  });
}

/**
 * List users with optional filters
 */
async function listUsers(supabase: any, body: any, rateLimitHeaders: any): Promise<Response> {
  const { tenant_id, role, limit = 100 } = body;

  console.log(`[user-management] Listing users with filters:`, { tenant_id, role, limit });

  // Get all users from auth
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('[user-management] Error fetching users:', authError);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch users',
      code: 'FETCH_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
    });
  }

  let users = authData.users;

  // Filter by tenant_id if provided
  if (tenant_id) {
    users = users.filter((u: any) => u.user_metadata?.tenant_id === tenant_id);
  }

  // Apply limit
  users = users.slice(0, limit);

  // Format response
  const formattedUsers = users.map((u: any) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    email_confirmed_at: u.email_confirmed_at,
    user_metadata: u.user_metadata
  }));

  return new Response(JSON.stringify({ 
    users: formattedUsers,
    total: formattedUsers.length
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...rateLimitHeaders }
  });
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

serve(handler);
