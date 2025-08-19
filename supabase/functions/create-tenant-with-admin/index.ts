
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-correlation-id, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// System role codes from the centralized system
const SYSTEM_ROLE_CODES = {
  SUPER_ADMIN: 'super_admin',
  PLATFORM_ADMIN: 'platform_admin',
  TENANT_OWNER: 'tenant_owner',
  TENANT_ADMIN: 'tenant_admin',
  TENANT_MANAGER: 'tenant_manager',
  DEALER: 'dealer',
  AGENT: 'agent',
  FARMER: 'farmer',
  TENANT_USER: 'tenant_user'
} as const;

interface CreateTenantRequest {
  name: string;
  slug: string;
  type?: string;
  status?: string;
  subscription_plan?: string;
  owner_email: string;
  owner_name: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: Record<string, any>;
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
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get request headers for logging
    const requestId = req.headers.get('x-request-id') || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const correlationId = req.headers.get('x-correlation-id') || `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const idempotencyKey = req.headers.get('idempotency-key');

    console.log(`[${requestId}] create-tenant-with-admin: Processing request with correlation ID: ${correlationId}`);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED',
          request_id: requestId
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let requestBody: CreateTenantRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error(`[${requestId}] create-tenant-with-admin: Invalid JSON in request body:`, error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
          request_id: requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] create-tenant-with-admin: Request body:`, JSON.stringify(requestBody, null, 2));

    // Validate required fields
    if (!requestBody.name?.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tenant name is required',
          code: 'VALIDATION_ERROR',
          request_id: requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!requestBody.slug?.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tenant slug is required',
          code: 'VALIDATION_ERROR',
          request_id: requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!requestBody.owner_email?.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Owner email is required',
          code: 'VALIDATION_ERROR',
          request_id: requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for idempotency
    if (idempotencyKey) {
      console.log(`[${requestId}] create-tenant-with-admin: Checking idempotency for key: ${idempotencyKey}`);
      
      const { data: existingRequest } = await supabaseClient
        .from('tenant_creation_requests')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single();

      if (existingRequest) {
        console.log(`[${requestId}] create-tenant-with-admin: Found existing request for idempotency key`);
        
        if (existingRequest.status === 'completed') {
          return new Response(
            JSON.stringify({
              success: true,
              tenant_id: existingRequest.tenant_id,
              message: 'Tenant already created (idempotent)',
              request_id: requestId,
              correlation_id: correlationId,
              idempotency_key: idempotencyKey
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } else if (existingRequest.status === 'failed') {
          // Allow retry for failed requests
          console.log(`[${requestId}] create-tenant-with-admin: Previous request failed, allowing retry`);
        } else {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Request already in progress',
              code: 'REQUEST_IN_PROGRESS',
              request_id: requestId
            }),
            { 
              status: 409, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }

    // Create idempotency record
    const { data: idempotencyRecord, error: idempotencyError } = await supabaseClient
      .from('tenant_creation_requests')
      .insert({
        idempotency_key: idempotencyKey || `auto-${requestId}`,
        request_data: requestBody,
        status: 'processing',
        correlation_id: correlationId,
        request_id: requestId
      })
      .select()
      .single();

    if (idempotencyError) {
      console.error(`[${requestId}] create-tenant-with-admin: Failed to create idempotency record:`, idempotencyError);
    }

    let tenantId: string | null = null;

    try {
      // Step 1: Create the tenant
      console.log(`[${requestId}] create-tenant-with-admin: Creating tenant...`);
      
      const tenantData = {
        name: requestBody.name,
        slug: requestBody.slug,
        type: requestBody.type || 'agri_company',
        status: requestBody.status || 'trial',
        subscription_plan: requestBody.subscription_plan || 'Kisan_Basic',
        owner_name: requestBody.owner_name,
        owner_email: requestBody.owner_email,
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
        metadata: requestBody.metadata || {}
      };

      const { data: tenant, error: tenantError } = await supabaseClient
        .from('tenants')
        .insert(tenantData)
        .select()
        .single();

      if (tenantError) {
        console.error(`[${requestId}] create-tenant-with-admin: Tenant creation error:`, tenantError);
        throw new Error(`Failed to create tenant: ${tenantError.message}`);
      }

      tenantId = tenant.id;
      console.log(`[${requestId}] create-tenant-with-admin: Tenant created successfully with ID: ${tenantId}`);

      // Step 2: Create default tenant branding
      console.log(`[${requestId}] create-tenant-with-admin: Creating default branding...`);
      
      const { error: brandingError } = await supabaseClient
        .from('tenant_branding')
        .insert({
          tenant_id: tenantId,
          primary_color: '#10B981',
          secondary_color: '#065F46',
          accent_color: '#F59E0B',
          app_name: requestBody.name,
          logo_url: null
        });

      if (brandingError) {
        console.error(`[${requestId}] create-tenant-with-admin: Branding creation error:`, brandingError);
        // Don't fail the whole process for branding
      }

      // Step 3: Create default tenant features based on subscription plan
      console.log(`[${requestId}] create-tenant-with-admin: Creating default features...`);
      
      const features = getDefaultFeatures(requestBody.subscription_plan || 'Kisan_Basic');
      
      const { error: featuresError } = await supabaseClient
        .from('tenant_features')
        .insert({
          tenant_id: tenantId,
          ...features
        });

      if (featuresError) {
        console.error(`[${requestId}] create-tenant-with-admin: Features creation error:`, featuresError);
        // Don't fail the whole process for features
      }

      // Step 4: Create/Find admin user and establish tenant relationship
      console.log(`[${requestId}] create-tenant-with-admin: Setting up admin user...`);

      // Check if user already exists in auth
      const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
      const authUser = existingUser?.users?.find(u => u.email === requestBody.owner_email);

      let userId: string;

      if (authUser) {
        console.log(`[${requestId}] create-tenant-with-admin: Found existing auth user: ${authUser.id}`);
        userId = authUser.id;
      } else {
        console.log(`[${requestId}] create-tenant-with-admin: Creating new auth user...`);
        
        // Create auth user
        const { data: newUser, error: authError } = await supabaseClient.auth.admin.createUser({
          email: requestBody.owner_email,
          email_confirm: true,
          user_metadata: {
            full_name: requestBody.owner_name,
            phone: requestBody.owner_phone,
            tenant_id: tenantId,
            role: SYSTEM_ROLE_CODES.TENANT_ADMIN
          }
        });

        if (authError) {
          console.error(`[${requestId}] create-tenant-with-admin: Auth user creation error:`, authError);
          throw new Error(`Failed to create admin user: ${authError.message}`);
        }

        userId = newUser.user!.id;
        console.log(`[${requestId}] create-tenant-with-admin: Auth user created with ID: ${userId}`);
      }

      // Step 5: Create user-tenant relationship using direct insert
      console.log(`[${requestId}] create-tenant-with-admin: Creating user-tenant relationship...`);

      const { error: relationshipError } = await supabaseClient
        .from('user_tenants')
        .upsert({
          user_id: userId,
          tenant_id: tenantId,
          role: SYSTEM_ROLE_CODES.TENANT_ADMIN,
          is_active: true,
          metadata: {
            created_as: 'tenant_creator',
            created_by_function: 'create-tenant-with-admin',
            request_id: requestId,
            correlation_id: correlationId
          }
        }, {
          onConflict: 'user_id,tenant_id'
        });

      if (relationshipError) {
        console.error(`[${requestId}] create-tenant-with-admin: User-tenant relationship error:`, relationshipError);
        throw new Error(`Failed to create user-tenant relationship: ${relationshipError.message}`);
      }

      console.log(`[${requestId}] create-tenant-with-admin: User-tenant relationship created successfully`);

      // Update idempotency record as completed
      if (idempotencyRecord) {
        await supabaseClient
          .from('tenant_creation_requests')
          .update({
            status: 'completed',
            tenant_id: tenantId,
            completed_at: new Date().toISOString()
          })
          .eq('id', idempotencyRecord.id);
      }

      // Success response
      const successResponse = {
        success: true,
        tenant_id: tenantId,
        user_id: userId,
        message: 'Tenant and admin user created successfully',
        request_id: requestId,
        correlation_id: correlationId
      };

      console.log(`[${requestId}] create-tenant-with-admin: Success response:`, JSON.stringify(successResponse, null, 2));

      return new Response(
        JSON.stringify(successResponse),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      console.error(`[${requestId}] create-tenant-with-admin: Process error:`, error);

      // Update idempotency record as failed
      if (idempotencyRecord) {
        await supabaseClient
          .from('tenant_creation_requests')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('id', idempotencyRecord.id);
      }

      // If we created a tenant but failed later, we should clean up
      if (tenantId) {
        console.log(`[${requestId}] create-tenant-with-admin: Attempting cleanup of tenant ${tenantId}`);
        try {
          await supabaseClient.from('tenant_features').delete().eq('tenant_id', tenantId);
          await supabaseClient.from('tenant_branding').delete().eq('tenant_id', tenantId);
          await supabaseClient.from('user_tenants').delete().eq('tenant_id', tenantId);
          await supabaseClient.from('tenants').delete().eq('id', tenantId);
          console.log(`[${requestId}] create-tenant-with-admin: Cleanup completed`);
        } catch (cleanupError) {
          console.error(`[${requestId}] create-tenant-with-admin: Cleanup error:`, cleanupError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Internal server error',
          code: 'PROCESSING_ERROR',
          request_id: requestId
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('create-tenant-with-admin: Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})

// Helper function to get default features based on subscription plan
function getDefaultFeatures(subscriptionPlan: string) {
  const baseFeatures = {
    ai_chat: false,
    weather_forecast: true,
    marketplace: true,
    community_forum: false,
    satellite_imagery: false,
    soil_testing: false,
    drone_monitoring: false,
    iot_integration: false,
    ecommerce: false,
    payment_gateway: false,
    inventory_management: false,
    logistics_tracking: false,
    basic_analytics: true,
    advanced_analytics: false,
    predictive_analytics: false,
    custom_reports: false,
    api_access: false,
    webhook_support: false,
    third_party_integrations: false,
    white_label_mobile_app: false
  };

  switch (subscriptionPlan) {
    case 'AI_Enterprise':
      return {
        ...baseFeatures,
        ai_chat: true,
        satellite_imagery: true,
        soil_testing: true,
        drone_monitoring: true,
        iot_integration: true,
        ecommerce: true,
        payment_gateway: true,
        inventory_management: true,
        logistics_tracking: true,
        advanced_analytics: true,
        predictive_analytics: true,
        custom_reports: true,
        api_access: true,
        webhook_support: true,
        third_party_integrations: true,
        white_label_mobile_app: true
      };
      
    case 'Shakti_Growth':
      return {
        ...baseFeatures,
        ai_chat: true,
        satellite_imagery: true,
        ecommerce: true,
        inventory_management: true,
        advanced_analytics: true,
        api_access: true,
        webhook_support: true
      };
      
    default: // Kisan_Basic
      return baseFeatures;
  }
}
