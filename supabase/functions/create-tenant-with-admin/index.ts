
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-correlation-id, idempotency-key',
}

interface CreateTenantRequest {
  name: string;
  slug: string;
  type: string;
  status?: string;
  subscription_plan?: string;
  owner_email: string;
  owner_name: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: any;
  established_date?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  subdomain?: string;
  custom_domain?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const requestId = req.headers.get('x-request-id') || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const correlationId = req.headers.get('x-correlation-id') || `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[${requestId}] Creating tenant with admin user`);

    // Get current user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error(`[${requestId}] No authorization header provided`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required - No authorization header',
          code: 'UNAUTHORIZED'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error(`[${requestId}] Authentication failed:`, userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required - Invalid token',
          code: 'INVALID_TOKEN'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] Authenticated user: ${user.id} (${user.email})`);

    // Check admin permissions
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminUser || !['super_admin', 'platform_admin'].includes(adminUser.role)) {
      console.error(`[${requestId}] Insufficient privileges for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PRIVILEGES'
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestBody: CreateTenantRequest = await req.json();

    // Enhanced validation for required fields
    const requiredFields = ['name', 'slug', 'owner_email', 'owner_name'];
    const missingFields = requiredFields.filter(field => !requestBody[field] || !requestBody[field].toString().trim());
    
    if (missingFields.length > 0) {
      console.error(`[${requestId}] Missing required fields: ${missingFields.join(', ')}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          code: 'MISSING_FIELDS',
          missing_fields: missingFields
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestBody.owner_email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if slug is available
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', requestBody.slug)
      .single();

    if (existingTenant) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Slug already exists',
          code: 'SLUG_EXISTS'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] Creating tenant: ${requestBody.name} with slug: ${requestBody.slug}`);

    // Step 1: Create the tenant with proper created_by field
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: requestBody.name.trim(),
        slug: requestBody.slug.trim(),
        type: requestBody.type || 'agri_company',
        status: requestBody.status || 'trial',
        subscription_plan: requestBody.subscription_plan || 'Kisan_Basic',
        owner_email: requestBody.owner_email.trim(),
        owner_name: requestBody.owner_name.trim(),
        owner_phone: requestBody.owner_phone?.trim(),
        business_registration: requestBody.business_registration?.trim(),
        business_address: requestBody.business_address,
        established_date: requestBody.established_date,
        subscription_start_date: requestBody.subscription_start_date,
        subscription_end_date: requestBody.subscription_end_date,
        trial_ends_at: requestBody.trial_ends_at,
        max_farmers: requestBody.max_farmers || 1000,
        max_dealers: requestBody.max_dealers || 50,
        max_products: requestBody.max_products || 100,
        max_storage_gb: requestBody.max_storage_gb || 10,
        max_api_calls_per_day: requestBody.max_api_calls_per_day || 10000,
        subdomain: requestBody.subdomain?.trim(),
        custom_domain: requestBody.custom_domain?.trim(),
        created_by: user.id, // Critical: Set created_by to authenticated user's ID
        updated_by: user.id,
        metadata: {
          ...requestBody.metadata,
          created_via: 'admin_portal',
          correlation_id: correlationId,
          created_by_email: user.email
        }
      })
      .select()
      .single();

    if (tenantError) {
      console.error(`[${requestId}] Error creating tenant:`, tenantError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create tenant: ${tenantError.message}`,
          code: 'TENANT_CREATION_ERROR',
          details: tenantError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] Tenant created successfully: ${tenant.id}`);

    // Step 2: Create admin user account
    const randomPassword = Math.random().toString(36).slice(-12) + '!A1';
    const { data: adminUserData, error: adminUserError } = await supabase.auth.admin.createUser({
      email: requestBody.owner_email.trim(),
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: requestBody.owner_name.trim(),
        tenant_id: tenant.id,
        role: 'tenant_admin',
        created_via: 'tenant_creation',
        correlation_id: correlationId
      }
    });

    if (adminUserError) {
      console.error(`[${requestId}] Error creating admin user:`, adminUserError);
      
      // Rollback tenant creation
      await supabase.from('tenants').delete().eq('id', tenant.id);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create admin user: ${adminUserError.message}`,
          code: 'ADMIN_USER_CREATION_ERROR',
          details: adminUserError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] Admin user created: ${adminUserData.user.id}`);

    // Step 3: Create user-tenant relationship directly without calling external function
    const { data: relationship, error: relationshipError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: adminUserData.user.id,
        tenant_id: tenant.id,
        role: 'tenant_admin',
        is_active: true,
        metadata: {
          created_via: 'tenant_creation',
          auto_assigned: true,
          created_by: user.id,
          correlation_id: correlationId,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (relationshipError) {
      console.error(`[${requestId}] Error creating user-tenant relationship:`, relationshipError);
      
      // Rollback - delete tenant and user
      await supabase.from('tenants').delete().eq('id', tenant.id);
      await supabase.auth.admin.deleteUser(adminUserData.user.id);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create user-tenant relationship: ${relationshipError.message}`,
          code: 'USER_TENANT_RELATIONSHIP_ERROR',
          details: relationshipError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] User-tenant relationship created successfully: ${relationship.id}`);

    // Step 4: Send welcome email (optional - placeholder for future implementation)
    let emailSent = false;
    try {
      // TODO: Implement email sending logic here
      emailSent = true;
    } catch (emailError) {
      console.warn(`[${requestId}] Email sending failed:`, emailError);
      // Don't fail the entire operation for email issues
    }

    const response = {
      success: true,
      tenant_id: tenant.id,
      admin_user_id: adminUserData.user.id,
      relationship_id: relationship.id,
      tenant_name: tenant.name,
      admin_email: requestBody.owner_email,
      emailSent,
      correlationId,
      requestId,
      message: 'Tenant and admin user created successfully'
    };

    console.log(`[${requestId}] Tenant creation completed successfully`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in create-tenant-with-admin:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
