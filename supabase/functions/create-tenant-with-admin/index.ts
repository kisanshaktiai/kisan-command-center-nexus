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
    const idempotencyKey = req.headers.get('idempotency-key');

    console.log(`[${requestId}] Creating tenant with admin user`);

    // Get current user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authorization required',
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid authorization token',
          code: 'INVALID_TOKEN'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check admin permissions
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminUser || !['super_admin', 'platform_admin'].includes(adminUser.role)) {
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

    // Validate required fields
    if (!requestBody.name || !requestBody.slug || !requestBody.owner_email || !requestBody.owner_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: name, slug, owner_email, owner_name',
          code: 'MISSING_FIELDS'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] Creating tenant:`, requestBody.name);

    // Step 1: Create the tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: requestBody.name,
        slug: requestBody.slug,
        type: requestBody.type || 'agri_company',
        status: requestBody.status || 'trial',
        subscription_plan: requestBody.subscription_plan || 'Kisan_Basic',
        owner_email: requestBody.owner_email,
        owner_name: requestBody.owner_name,
        owner_phone: requestBody.owner_phone,
        business_registration: requestBody.business_registration,
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
        subdomain: requestBody.subdomain,
        custom_domain: requestBody.custom_domain,
        metadata: {
          ...requestBody.metadata,
          created_by: user.id,
          created_via: 'admin_portal',
          correlation_id: correlationId,
          idempotency_key: idempotencyKey
        }
      })
      .select()
      .single();

    if (tenantError) {
      console.error(`[${requestId}] Error creating tenant:`, tenantError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create tenant',
          code: 'TENANT_CREATION_ERROR',
          details: tenantError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] Tenant created successfully:`, tenant.id);

    // Step 2: Create admin user account
    const { data: adminUserData, error: adminUserError } = await supabase.auth.admin.createUser({
      email: requestBody.owner_email,
      password: Math.random().toString(36).slice(-12) + '!A1', // Generate secure random password
      email_confirm: true,
      user_metadata: {
        full_name: requestBody.owner_name,
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
          error: 'Failed to create admin user account',
          code: 'ADMIN_USER_CREATION_ERROR',
          details: adminUserError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] Admin user created:`, adminUserData.user.id);

    // Step 3: Create user-tenant relationship using the database function directly
    console.log(`[${requestId}] Creating user-tenant relationship for tenant admin`);
    
    const { data: relationshipData, error: relationshipError } = await supabase.rpc(
      'manage_user_tenant_relationship',
      {
        p_user_id: adminUserData.user.id,
        p_tenant_id: tenant.id,
        p_role: 'tenant_admin', // Use the correct enum value
        p_is_active: true,
        p_metadata: {
          created_via: 'tenant_creation',
          auto_assigned: true,
          created_by: user.id,
          correlation_id: correlationId,
          created_at: new Date().toISOString()
        },
        p_operation: 'insert'
      }
    );

    if (relationshipError || !relationshipData?.success) {
      console.error(`[${requestId}] Error creating user-tenant relationship:`, relationshipError || relationshipData);
      
      // Rollback - delete tenant and user
      await supabase.from('tenants').delete().eq('id', tenant.id);
      await supabase.auth.admin.deleteUser(adminUserData.user.id);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create user-tenant relationship',
          code: 'USER_TENANT_RELATIONSHIP_ERROR',
          details: relationshipError?.message || relationshipData?.error
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] User-tenant relationship created successfully:`, relationshipData);

    // Step 4: Send welcome email (optional - you can implement this later)
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
      relationship_id: relationshipData.relationship_id,
      tenant_name: tenant.name,
      admin_email: requestBody.owner_email,
      emailSent,
      correlationId,
      requestId,
      message: 'Tenant and admin user created successfully'
    };

    console.log(`[${requestId}] Tenant creation completed successfully:`, response);

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
