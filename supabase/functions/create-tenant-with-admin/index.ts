
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

interface CreateTenantRequest {
  name: string;
  slug: string;
  type: string;
  subscription_plan: string;
  owner_email: string;
  owner_name: string;
  metadata?: Record<string, any>;
}

interface RateLimit {
  identifier: string;
  identifierType: 'admin' | 'ip';
  requestCount: number;
  windowStart: number;
  lastRequest: number;
}

// Enhanced email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Generate correlation ID for request tracking
function generateCorrelationId(): string {
  return `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Rate limiting check
async function checkRateLimit(
  supabaseServiceRole: any,
  adminId: string,
  ipAddress: string
): Promise<{ allowed: boolean; error?: string }> {
  const now = Date.now();
  const windowDurationMs = 60 * 1000; // 1 minute
  const maxRequestsPerWindow = 5;
  const maxRequestsPerIpWindow = 10;

  try {
    // Clean up old rate limit records first
    await supabaseServiceRole.rpc('cleanup_old_rate_limits');

    // Check admin rate limit
    const { data: adminLimit, error: adminError } = await supabaseServiceRole
      .from('rate_limits')
      .select('*')
      .eq('identifier', adminId)
      .eq('identifier_type', 'admin')
      .eq('endpoint', 'create-tenant-with-admin')
      .single();

    if (!adminError && adminLimit) {
      const timeSinceWindowStart = now - new Date(adminLimit.window_start).getTime();
      
      if (timeSinceWindowStart < windowDurationMs) {
        if (adminLimit.request_count >= maxRequestsPerWindow) {
          return { allowed: false, error: 'Admin rate limit exceeded. Please wait before creating another tenant.' };
        }
        
        // Update existing record
        await supabaseServiceRole
          .from('rate_limits')
          .update({
            request_count: adminLimit.request_count + 1,
            last_request: new Date().toISOString()
          })
          .eq('id', adminLimit.id);
      } else {
        // Reset window
        await supabaseServiceRole
          .from('rate_limits')
          .update({
            request_count: 1,
            window_start: new Date().toISOString(),
            last_request: new Date().toISOString()
          })
          .eq('id', adminLimit.id);
      }
    } else {
      // Create new admin rate limit record
      await supabaseServiceRole
        .from('rate_limits')
        .insert({
          identifier: adminId,
          identifier_type: 'admin',
          endpoint: 'create-tenant-with-admin',
          request_count: 1,
          window_start: new Date().toISOString(),
          last_request: new Date().toISOString()
        });
    }

    // Check IP rate limit
    const { data: ipLimit, error: ipError } = await supabaseServiceRole
      .from('rate_limits')
      .select('*')
      .eq('identifier', ipAddress)
      .eq('identifier_type', 'ip')
      .eq('endpoint', 'create-tenant-with-admin')
      .single();

    if (!ipError && ipLimit) {
      const timeSinceWindowStart = now - new Date(ipLimit.window_start).getTime();
      
      if (timeSinceWindowStart < windowDurationMs) {
        if (ipLimit.request_count >= maxRequestsPerIpWindow) {
          return { allowed: false, error: 'IP rate limit exceeded. Too many requests from this location.' };
        }
        
        // Update existing record
        await supabaseServiceRole
          .from('rate_limits')
          .update({
            request_count: ipLimit.request_count + 1,
            last_request: new Date().toISOString()
          })
          .eq('id', ipLimit.id);
      } else {
        // Reset window
        await supabaseServiceRole
          .from('rate_limits')
          .update({
            request_count: 1,
            window_start: new Date().toISOString(),
            last_request: new Date().toISOString()
          })
          .eq('id', ipLimit.id);
      }
    } else {
      // Create new IP rate limit record
      await supabaseServiceRole
        .from('rate_limits')
        .insert({
          identifier: ipAddress,
          identifier_type: 'ip',
          endpoint: 'create-tenant-with-admin',
          request_count: 1,
          window_start: new Date().toISOString(),
          last_request: new Date().toISOString()
        });
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Allow request on rate limit error to avoid blocking legitimate requests
    return { allowed: true };
  }
}

// Check idempotency
async function checkIdempotency(
  supabaseServiceRole: any,
  idempotencyKey: string,
  adminId: string
): Promise<{ shouldProceed: boolean; existingResult?: any }> {
  try {
    const { data: existingRequest, error } = await supabaseServiceRole
      .from('tenant_creation_requests')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    if (existingRequest) {
      if (existingRequest.status === 'completed' && existingRequest.tenant_id) {
        // Return existing successful result
        return {
          shouldProceed: false,
          existingResult: {
            success: true,
            tenant_id: existingRequest.tenant_id,
            message: 'Tenant already exists (idempotent request)',
            isIdempotent: true
          }
        };
      } else if (existingRequest.status === 'processing') {
        // Request is still processing
        return {
          shouldProceed: false,
          existingResult: {
            success: false,
            error: 'Tenant creation already in progress',
            code: 'DUPLICATE_REQUEST'
          }
        };
      } else if (existingRequest.status === 'failed') {
        // Previous request failed, allow retry
        await supabaseServiceRole
          .from('tenant_creation_requests')
          .update({ status: 'processing' })
          .eq('id', existingRequest.id);
        return { shouldProceed: true };
      }
    }

    // Create new idempotency record
    await supabaseServiceRole
      .from('tenant_creation_requests')
      .insert({
        idempotency_key: idempotencyKey,
        admin_id: adminId,
        status: 'processing',
        request_data: {}
      });

    return { shouldProceed: true };
  } catch (error) {
    console.error('Idempotency check error:', error);
    // Allow request on idempotency error
    return { shouldProceed: true };
  }
}

const handler = async (req: Request): Promise<Response> => {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Get service role client
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get regular client for current user verification
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    // Extract request metadata
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const idempotencyKey = req.headers.get("idempotency-key");
    const requestId = req.headers.get("x-request-id") || correlationId;

    // Verify current user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      await supabaseServiceRole.rpc('log_enhanced_admin_action', {
        p_action: 'tenant_creation_failed',
        p_details: { error: 'Unauthorized', reason: 'No valid user token' },
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_request_id: requestId,
        p_correlation_id: correlationId,
        p_security_context: { auth_header_present: !!authHeader }
      });

      return new Response(JSON.stringify({ 
        error: "Unauthorized", 
        correlationId 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser || !adminUser.is_active) {
      await supabaseServiceRole.rpc('log_enhanced_admin_action', {
        p_action: 'tenant_creation_denied',
        p_target_admin_id: user.id,
        p_details: { error: 'Admin access required', admin_status: adminUser },
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_request_id: requestId,
        p_correlation_id: correlationId
      });

      return new Response(JSON.stringify({ 
        error: "Admin access required", 
        correlationId 
      }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(supabaseServiceRole, user.id, ipAddress);
    if (!rateLimitResult.allowed) {
      await supabaseServiceRole.rpc('log_enhanced_admin_action', {
        p_action: 'tenant_creation_rate_limited',
        p_target_admin_id: user.id,
        p_details: { error: rateLimitResult.error },
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_request_id: requestId,
        p_correlation_id: correlationId,
        p_security_context: { rate_limit_triggered: true }
      });

      return new Response(JSON.stringify({ 
        error: rateLimitResult.error,
        correlationId,
        code: 'RATE_LIMITED'
      }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requestData: CreateTenantRequest = await req.json();

    // Enhanced validation
    if (!requestData.name?.trim() || !requestData.slug?.trim() || 
        !requestData.owner_email?.trim() || !requestData.owner_name?.trim()) {
      await supabaseServiceRole.rpc('log_enhanced_admin_action', {
        p_action: 'tenant_creation_validation_failed',
        p_target_admin_id: user.id,
        p_details: { error: 'Missing required fields', provided_fields: Object.keys(requestData) },
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_request_id: requestId,
        p_correlation_id: correlationId,
        p_request_payload: requestData
      });

      return new Response(JSON.stringify({ 
        error: "Missing required fields", 
        correlationId 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Email format validation
    if (!isValidEmail(requestData.owner_email)) {
      await supabaseServiceRole.rpc('log_enhanced_admin_action', {
        p_action: 'tenant_creation_validation_failed',
        p_target_admin_id: user.id,
        p_details: { error: 'Invalid email format', email: requestData.owner_email },
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_request_id: requestId,
        p_correlation_id: correlationId
      });

      return new Response(JSON.stringify({ 
        error: "Invalid email format", 
        correlationId 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const idempotencyResult = await checkIdempotency(supabaseServiceRole, idempotencyKey, user.id);
      if (!idempotencyResult.shouldProceed) {
        return new Response(JSON.stringify(idempotencyResult.existingResult), {
          status: idempotencyResult.existingResult?.success ? 200 : 409,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    console.log("Creating tenant with enhanced security:", { 
      ...requestData, 
      owner_email: requestData.owner_email,
      correlationId,
      adminId: user.id 
    });

    // Check slug availability
    const { data: existingTenant } = await supabaseServiceRole
      .from('tenants')
      .select('id')
      .eq('slug', requestData.slug)
      .single();

    if (existingTenant) {
      await supabaseServiceRole.rpc('log_enhanced_admin_action', {
        p_action: 'tenant_creation_failed',
        p_target_admin_id: user.id,
        p_details: { error: 'Slug already exists', slug: requestData.slug },
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_request_id: requestId,
        p_correlation_id: correlationId,
        p_request_payload: requestData
      });

      return new Response(JSON.stringify({ 
        error: "Slug already exists", 
        correlationId 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user already exists in auth.users
    const { data: existingAuthUser } = await supabaseServiceRole.auth.admin.listUsers();
    const userExists = existingAuthUser.users?.find(u => u.email === requestData.owner_email);

    let authUser;
    let tempPassword = '';
    let isNewUser = false;
    let authUserCreationError = null;

    if (userExists) {
      console.log("User already exists in auth.users:", requestData.owner_email);
      authUser = { user: userExists };
    } else {
      console.log("Creating new user in auth.users:", requestData.owner_email);
      isNewUser = true;

      // Generate secure temporary password
      const generateSecurePassword = (): string => {
        const length = 16;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        // Ensure at least one of each type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        password += '0123456789'[Math.floor(Math.random() * 10)];
        password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
        
        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
          password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => 0.5 - Math.random()).join('');
      };

      tempPassword = generateSecurePassword();

      // Create admin user in auth.users using service role
      const createUserResult = await supabaseServiceRole.auth.admin.createUser({
        email: requestData.owner_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: requestData.owner_name,
          tenant_slug: requestData.slug,
          role: 'tenant_admin',
          created_by_admin: user.id,
          correlation_id: correlationId
        }
      });

      if (createUserResult.error) {
        authUserCreationError = createUserResult.error;
        console.error('Error creating auth user:', createUserResult.error);
        
        await supabaseServiceRole.rpc('log_enhanced_admin_action', {
          p_action: 'tenant_creation_auth_failed',
          p_target_admin_id: user.id,
          p_details: { error: createUserResult.error.message, email: requestData.owner_email },
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
          p_request_id: requestId,
          p_correlation_id: correlationId,
          p_duration_ms: Date.now() - startTime
        });

        return new Response(JSON.stringify({ 
          error: `Failed to create admin user: ${createUserResult.error.message}`,
          correlationId 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      authUser = createUserResult;
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseServiceRole
      .from('tenants')
      .insert({
        name: requestData.name,
        slug: requestData.slug,
        type: requestData.type,
        subscription_plan: requestData.subscription_plan,
        owner_email: requestData.owner_email,
        owner_name: requestData.owner_name,
        subdomain: requestData.slug,
        metadata: {
          ...requestData.metadata,
          admin_user_id: authUser.user.id,
          created_via: 'admin_creation',
          is_new_user: isNewUser,
          created_by_admin: user.id,
          correlation_id: correlationId
        },
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      
      // Clean up auth user if tenant creation fails and it's a new user
      if (isNewUser && !authUserCreationError) {
        await supabaseServiceRole.auth.admin.deleteUser(authUser.user.id);
      }

      await supabaseServiceRole.rpc('log_enhanced_admin_action', {
        p_action: 'tenant_creation_failed',
        p_target_admin_id: user.id,
        p_details: { error: tenantError.message, tenant_data: requestData },
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_request_id: requestId,
        p_correlation_id: correlationId,
        p_duration_ms: Date.now() - startTime
      });

      return new Response(JSON.stringify({ 
        error: tenantError.message,
        correlationId 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create user_tenants relationship
    const { error: relationError } = await supabaseServiceRole
      .from('user_tenants')
      .insert({
        user_id: authUser.user.id,
        tenant_id: tenant.id,
        role: 'tenant_owner',
        is_active: true,
        joined_at: new Date().toISOString()
      });

    if (relationError) {
      console.error('Error creating user-tenant relation:', relationError);
    }

    // Update idempotency record on success
    if (idempotencyKey) {
      await supabaseServiceRole
        .from('tenant_creation_requests')
        .update({
          status: 'completed',
          tenant_id: tenant.id,
          completed_at: new Date().toISOString()
        })
        .eq('idempotency_key', idempotencyKey);
    }

    // Send welcome email with enhanced error handling
    let emailSent = false;
    let emailError = '';
    let emailWarnings = [];

    try {
      console.log("Attempting to send welcome email...");
      
      const loginUrl = `${req.headers.get('origin') || 'https://f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.lovableproject.com'}/auth`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0;">Welcome to ${requestData.name}</h1>
          </div>
          <div style="padding: 40px 30px; background: white;">
            <h2>Hi ${requestData.owner_name},</h2>
            <p>Your ${requestData.name} account has been set up successfully. Here are your login credentials:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${requestData.owner_email}</p>
              ${isNewUser ? `<p><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>` : '<p><strong>Login:</strong> Use your existing password</p>'}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Your Account</a>
            </div>
            ${isNewUser ? '<p><strong>Important:</strong> Please change your password after your first login for security reasons.</p>' : ''}
            <p>Best regards,<br>The KisanShaktiAI Team</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This email contains sensitive login information. Please keep it secure.</p>
            <p>© 2025 KisanShaktiAI. All rights reserved.</p>
          </div>
        </div>
      `;

      const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: requestData.owner_email,
          subject: `Welcome to ${requestData.name} - Your Account is Ready!`,
          html: emailHtml,
          metadata: {
            tenantId: tenant.id,
            userId: authUser.user.id,
            template_type: 'tenant_welcome_creation',
            correlation_id: correlationId,
            is_new_user: isNewUser
          }
        }),
      });

      if (emailResponse.ok) {
        const emailResult = await emailResponse.json();
        console.log('Email sent successfully:', emailResult);
        emailSent = true;
      } else {
        const emailErrorText = await emailResponse.text();
        console.error('Failed to send welcome email:', emailErrorText);
        emailError = emailErrorText;
        emailWarnings.push('Email delivery failed but tenant was created successfully');
      }
    } catch (error) {
      console.error('Error sending welcome email:', error);
      emailError = error.message;
      emailWarnings.push('Email service unavailable but tenant was created successfully');
    }

    // Enhanced audit logging for successful creation
    await supabaseServiceRole.rpc('log_enhanced_admin_action', {
      p_action: 'tenant_created_successfully',
      p_target_admin_id: authUser.user.id,
      p_details: { 
        tenant_id: tenant.id,
        tenant_name: requestData.name,
        tenant_slug: requestData.slug,
        is_new_user: isNewUser,
        email_sent: emailSent,
        email_warnings: emailWarnings
      },
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_request_id: requestId,
      p_correlation_id: correlationId,
      p_request_payload: { ...requestData, owner_email: '[REDACTED]' },
      p_response_data: { tenant_id: tenant.id, email_sent: emailSent },
      p_duration_ms: Date.now() - startTime,
      p_security_context: { 
        rate_limited: false, 
        idempotent_request: !!idempotencyKey,
        auth_user_created: isNewUser
      }
    });

    // Return success response WITHOUT temporary password
    const response = { 
      success: true, 
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status
      },
      message: 'Tenant created successfully with admin user',
      adminEmail: requestData.owner_email,
      emailSent: emailSent,
      isNewUser: isNewUser,
      correlationId,
      warnings: emailWarnings.length > 0 ? emailWarnings : undefined
    };

    // Add email error to response if present but don't fail the request
    if (!emailSent && emailError) {
      response.emailError = 'Email delivery failed - please check email settings';
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in create-tenant-with-admin:", error);
    
    // Enhanced error audit logging
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    
    try {
      await supabaseServiceRole.rpc('log_enhanced_admin_action', {
        p_action: 'tenant_creation_error',
        p_details: { 
          error: error.message || 'Unknown error',
          stack: error.stack,
          error_type: error.constructor.name
        },
        p_ip_address: req.headers.get("x-forwarded-for") || "unknown",
        p_user_agent: req.headers.get("user-agent") || "unknown",
        p_request_id: req.headers.get("x-request-id") || correlationId,
        p_correlation_id: correlationId,
        p_duration_ms: Date.now() - startTime,
        p_security_context: { error_boundary: true }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create tenant",
      correlationId,
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
