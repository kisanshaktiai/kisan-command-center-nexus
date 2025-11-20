import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const attemptTracker = new Map<string, { count: number; firstAttempt: number }>();

// Password requirements
const MIN_PASSWORD_LENGTH = 12;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;

const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmedEmail = email.trim();
  if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: `Email must not exceed ${MAX_EMAIL_LENGTH} characters` };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
};

const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return { valid: false, error: 'Password must contain uppercase, lowercase, and numbers' };
  }
  
  return { valid: true };
};

const validateFullName = (fullName: string): { valid: boolean; error?: string } => {
  if (!fullName || typeof fullName !== 'string') {
    return { valid: false, error: 'Full name is required' };
  }
  
  const trimmedName = fullName.trim();
  if (trimmedName.length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters' };
  }
  
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Full name must not exceed ${MAX_NAME_LENGTH} characters` };
  }
  
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { valid: false, error: 'Full name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { valid: true };
};

const getClientIP = (req: Request): string => {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
};

const checkRateLimit = (ip: string): { allowed: boolean; error?: string } => {
  const now = Date.now();
  const tracker = attemptTracker.get(ip);
  
  if (!tracker) {
    attemptTracker.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  
  if (now - tracker.firstAttempt > RATE_LIMIT_WINDOW) {
    attemptTracker.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  
  if (tracker.count >= MAX_ATTEMPTS) {
    return { 
      allowed: false, 
      error: `Rate limit exceeded. Please try again in ${Math.ceil((RATE_LIMIT_WINDOW - (now - tracker.firstAttempt)) / 60000)} minutes` 
    };
  }
  
  tracker.count++;
  return { allowed: true };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    console.log('[admin-utilities] Received action:', action);

    // Route to admin user creation handler
    return await handleAdminUserCreation(body);
  } catch (error: any) {
    console.error('[admin-utilities] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};


const handleAdminUserCreation = async (body: any): Promise<Response> => {
  try {
    const { operation, ...payload } = body;

    if (!operation || !['create-super-admin', 'validate-email', 'generate-monitoring-data'].includes(operation)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid operation. Must be one of: create-super-admin, validate-email, generate-monitoring-data'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle operations
    switch (operation) {
      case 'validate-email': {
        const { email } = payload;
        const emailValidation = validateEmail(email);
        
        if (!emailValidation.valid) {
          return new Response(
            JSON.stringify({ valid: false, exists: false, message: emailValidation.error }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: existingTenant, error: tenantError } = await supabaseClient
          .from('tenants')
          .select('id, owner_email')
          .ilike('owner_email', email.trim())
          .limit(1)
          .single();

        if (tenantError && tenantError.code !== 'PGRST116') {
          throw tenantError;
        }

        return new Response(
          JSON.stringify({
            valid: true,
            exists: !!existingTenant,
            message: existingTenant ? 'Email is already registered as a tenant owner' : 'Email is available'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-super-admin': {
        const clientIP = getClientIP(req);
        const rateLimitCheck = checkRateLimit(clientIP);
        
        if (!rateLimitCheck.allowed) {
          return new Response(
            JSON.stringify({ success: false, error: rateLimitCheck.error }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { email, password, fullName } = payload;

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
          return new Response(
            JSON.stringify({ success: false, error: emailValidation.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          return new Response(
            JSON.stringify({ success: false, error: passwordValidation.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const nameValidation = validateFullName(fullName);
        if (!nameValidation.valid) {
          return new Response(
            JSON.stringify({ success: false, error: nameValidation.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if bootstrap is already complete
        const { data: systemConfig } = await supabaseClient
          .from('system_config')
          .select('bootstrap_completed')
          .eq('id', 1)
          .single();

        if (systemConfig?.bootstrap_completed) {
          return new Response(
            JSON.stringify({ success: false, error: 'System already bootstrapped' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create user
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: email.trim(),
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName.trim() }
        });

        if (authError || !authData.user) {
          throw new Error(authError?.message || 'Failed to create user');
        }

        // Insert admin record
        const { error: adminError } = await supabaseClient
          .from('admin_users')
          .insert({
            user_id: authData.user.id,
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            role: 'super_admin',
            permissions: ['*'],
            is_active: true
          });

        if (adminError) {
          await supabaseClient.auth.admin.deleteUser(authData.user.id);
          throw adminError;
        }

        // Mark bootstrap as complete
        await supabaseClient
          .from('system_config')
          .update({ bootstrap_completed: true, bootstrap_date: new Date().toISOString() })
          .eq('id', 1);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Super admin created successfully',
            userId: authData.user.id
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'generate-monitoring-data': {
        const now = new Date();
        
        const { data: tenants } = await supabaseClient
          .from('tenants')
          .select('id')
          .limit(10);
        
        const tenantId = tenants && tenants.length > 0 
          ? tenants[Math.floor(Math.random() * tenants.length)].id 
          : null;
        
        const systemHealthMetrics = [
          {
            tenant_id: tenantId,
            metric_type: 'system',
            metric_name: 'cpu_usage',
            value: 45 + Math.random() * 30,
            unit: 'percent',
            labels: { component: 'api-server' },
            timestamp: now.toISOString(),
            created_at: now.toISOString(),
          },
          {
            tenant_id: tenantId,
            metric_type: 'system',
            metric_name: 'memory_usage',
            value: 60 + Math.random() * 20,
            unit: 'percent',
            labels: { component: 'api-server' },
            timestamp: now.toISOString(),
            created_at: now.toISOString(),
          },
        ];

        const resourceUtilization = [
          {
            tenant_id: tenantId,
            resource_type: 'api_calls',
            current_usage: Math.floor(10000 + Math.random() * 5000),
            max_limit: 20000,
            period_start: new Date(now.getTime() - 3600000).toISOString(),
            period_end: now.toISOString(),
            metadata: { rate_limit_tier: 'standard' },
            created_at: now.toISOString(),
          },
        ];

        const apiLogs = [];
        const endpoints = ['/api/auth/login', '/api/users', '/api/farmers'];
        for (let i = 0; i < 5; i++) {
          apiLogs.push({
            tenant_id: tenantId,
            endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
            method: 'GET',
            status_code: Math.random() > 0.9 ? 500 : 200,
            response_time_ms: Math.floor(50 + Math.random() * 200),
            created_at: new Date(now.getTime() - Math.random() * 3600000).toISOString(),
          });
        }

        await Promise.all([
          supabaseClient.from('system_health_metrics').insert(systemHealthMetrics),
          supabaseClient.from('resource_utilization').insert(resourceUtilization),
          supabaseClient.from('api_logs').insert(apiLogs),
        ]);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Monitoring data generated successfully',
            data: {
              health_metrics: systemHealthMetrics.length,
              resource_records: resourceUtilization.length,
              api_logs: apiLogs.length,
              tenant_id: tenantId
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      default: {
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

  } catch (error) {
    console.error('Error in admin-utilities:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );
  }
};

serve(handler);
