
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-correlation-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

interface ManageUserTenantRequest {
  user_id: string;
  tenant_id: string;
  role: 'super_admin' | 'platform_admin' | 'tenant_admin' | 'tenant_owner' | 'tenant_user' | 'farmer' | 'dealer';
  is_active?: boolean;
  metadata?: Record<string, any>;
  operation?: 'insert' | 'update' | 'upsert';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    console.log(`[${requestId}] manage-user-tenant: Processing request`);

    // Parse request body
    let requestBody: ManageUserTenantRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error(`[${requestId}] manage-user-tenant: Invalid JSON in request body:`, error);
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

    console.log(`[${requestId}] manage-user-tenant: Request body:`, JSON.stringify(requestBody, null, 2));

    // Validate required fields
    const { user_id, tenant_id, role, is_active = true, metadata = {}, operation = 'upsert' } = requestBody;

    if (!user_id || !tenant_id || !role) {
      console.error(`[${requestId}] manage-user-tenant: Missing required fields:`, { user_id: !!user_id, tenant_id: !!tenant_id, role: !!role });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: user_id, tenant_id, and role are required',
          code: 'MISSING_REQUIRED_FIELDS',
          request_id: requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate role enum
    const validRoles = ['super_admin', 'platform_admin', 'tenant_admin', 'tenant_owner', 'tenant_user', 'farmer', 'dealer'];
    if (!validRoles.includes(role)) {
      console.error(`[${requestId}] manage-user-tenant: Invalid role:`, role);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`,
          code: 'INVALID_ROLE',
          request_id: requestId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call the database function with enhanced error handling
    console.log(`[${requestId}] manage-user-tenant: Calling database function with params:`, {
      p_user_id: user_id,
      p_tenant_id: tenant_id,
      p_role: role,
      p_is_active: is_active,
      p_metadata: metadata,
      p_operation: operation
    });

    const { data: dbResult, error: dbError } = await supabaseClient.rpc(
      'manage_user_tenant_relationship',
      {
        p_user_id: user_id,
        p_tenant_id: tenant_id,
        p_role: role,
        p_is_active: is_active,
        p_metadata: metadata,
        p_operation: operation
      }
    );

    if (dbError) {
      console.error(`[${requestId}] manage-user-tenant: Database function error:`, dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database function error: ${dbError.message}`,
          code: 'DATABASE_FUNCTION_ERROR',
          details: dbError,
          request_id: requestId
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${requestId}] manage-user-tenant: Database function result:`, JSON.stringify(dbResult, null, 2));

    // Check if the database function returned an error
    if (dbResult && !dbResult.success) {
      console.error(`[${requestId}] manage-user-tenant: Database function returned error:`, dbResult);
      return new Response(
        JSON.stringify({ 
          ...dbResult,
          request_id: requestId,
          correlation_id: correlationId
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Success response
    const successResponse = {
      ...dbResult,
      request_id: requestId,
      correlation_id: correlationId
    };

    console.log(`[${requestId}] manage-user-tenant: Success response:`, JSON.stringify(successResponse, null, 2));

    return new Response(
      JSON.stringify(successResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('manage-user-tenant: Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
