
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-correlation-id',
}

interface ManageUserTenantRequest {
  user_id: string;
  tenant_id: string;
  role: 'super_admin' | 'platform_admin' | 'tenant_admin' | 'tenant_owner' | 'tenant_user' | 'farmer' | 'dealer';
  is_active?: boolean;
  metadata?: Record<string, any>;
  operation?: 'insert' | 'update' | 'upsert';
}

interface SecurityContext {
  requestId: string;
  correlationId: string;
  userAgent?: string;
  ipAddress?: string;
  adminId?: string;
  adminRole?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Extract security context
    const securityContext: SecurityContext = {
      requestId: req.headers.get('x-request-id') || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      correlationId: req.headers.get('x-correlation-id') || `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    };

    console.log(`[${securityContext.requestId}] Managing user-tenant relationship request`);

    // Get current user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error(`[${securityContext.requestId}] No authorization header provided`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authorization required',
          code: 'UNAUTHORIZED',
          request_id: securityContext.requestId
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error(`[${securityContext.requestId}] Invalid token:`, userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid authorization token',
          code: 'INVALID_TOKEN',
          request_id: securityContext.requestId
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    securityContext.adminId = user.id;

    // Check if user is admin (super_admin, platform_admin, or tenant_admin)
    const { data: adminUser, error: adminCheckError } = await supabase
      .from('admin_users')
      .select('role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (adminCheckError && adminCheckError.code !== 'PGRST116') {
      console.error(`[${securityContext.requestId}] Error checking admin status:`, adminCheckError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error verifying admin status',
          code: 'ADMIN_CHECK_ERROR',
          request_id: securityContext.requestId
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If not an admin user, check if they have tenant admin privileges
    let hasPermission = false;
    let adminRole = '';

    if (adminUser) {
      securityContext.adminRole = adminUser.role;
      adminRole = adminUser.role;
      hasPermission = ['super_admin', 'platform_admin'].includes(adminUser.role);
    }

    // If not super/platform admin, check tenant admin privileges
    if (!hasPermission) {
      const { data: tenantRelations, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('role', ['tenant_admin', 'tenant_owner']);

      if (tenantError) {
        console.error(`[${securityContext.requestId}] Error checking tenant permissions:`, tenantError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error verifying tenant permissions',
            code: 'TENANT_CHECK_ERROR',
            request_id: securityContext.requestId
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      hasPermission = tenantRelations && tenantRelations.length > 0;
      if (hasPermission) {
        securityContext.adminRole = 'tenant_admin';
        adminRole = 'tenant_admin';
      }
    }

    if (!hasPermission) {
      console.error(`[${securityContext.requestId}] User ${user.id} lacks admin privileges`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PRIVILEGES',
          request_id: securityContext.requestId
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle different HTTP methods
    if (req.method === 'POST') {
      // Create or update user-tenant relationship
      const requestBody: ManageUserTenantRequest = await req.json();

      console.log(`[${securityContext.requestId}] Processing relationship request:`, {
        user_id: requestBody.user_id,
        tenant_id: requestBody.tenant_id,
        role: requestBody.role,
        operation: requestBody.operation || 'upsert'
      });

      // Validate request body
      if (!requestBody.user_id || !requestBody.tenant_id || !requestBody.role) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing required fields: user_id, tenant_id, role',
            code: 'MISSING_FIELDS',
            request_id: securityContext.requestId
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Additional security check: tenant admins can only manage their own tenants
      if (adminRole === 'tenant_admin') {
        const { data: adminTenants } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('role', ['tenant_admin', 'tenant_owner']);

        const allowedTenantIds = adminTenants?.map(t => t.tenant_id) || [];
        
        if (!allowedTenantIds.includes(requestBody.tenant_id)) {
          console.error(`[${securityContext.requestId}] Tenant admin ${user.id} attempted to manage unauthorized tenant ${requestBody.tenant_id}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Access denied: Cannot manage users for this tenant',
              code: 'TENANT_ACCESS_DENIED',
              request_id: securityContext.requestId
            }),
            { 
              status: 403, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      // Call the database function
      const { data: result, error: dbError } = await supabase.rpc(
        'manage_user_tenant_relationship',
        {
          p_user_id: requestBody.user_id,
          p_tenant_id: requestBody.tenant_id,
          p_role: requestBody.role,
          p_is_active: requestBody.is_active ?? true,
          p_metadata: {
            ...requestBody.metadata,
            managed_by: user.id,
            managed_by_role: adminRole,
            request_id: securityContext.requestId,
            correlation_id: securityContext.correlationId,
            user_agent: securityContext.userAgent,
            ip_address: securityContext.ipAddress
          },
          p_operation: requestBody.operation || 'upsert'
        }
      );

      if (dbError) {
        console.error(`[${securityContext.requestId}] Database error:`, dbError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Database operation failed',
            code: 'DATABASE_ERROR',
            details: dbError.message,
            request_id: securityContext.requestId
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Log successful operation
      console.log(`[${securityContext.requestId}] Successfully managed user-tenant relationship:`, result);

      return new Response(
        JSON.stringify({
          ...result,
          request_id: securityContext.requestId,
          correlation_id: securityContext.correlationId,
          managed_by: user.id,
          managed_by_role: adminRole
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else if (req.method === 'GET') {
      // Get user-tenant relationships
      const url = new URL(req.url);
      const userId = url.searchParams.get('user_id');
      const tenantId = url.searchParams.get('tenant_id');
      const includeInactive = url.searchParams.get('include_inactive') === 'true';

      console.log(`[${securityContext.requestId}] Fetching relationships:`, { userId, tenantId, includeInactive });

      // Additional security check for tenant admins
      if (adminRole === 'tenant_admin' && tenantId) {
        const { data: adminTenants } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .in('role', ['tenant_admin', 'tenant_owner']);

        const allowedTenantIds = adminTenants?.map(t => t.tenant_id) || [];
        
        if (!allowedTenantIds.includes(tenantId)) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Access denied: Cannot view relationships for this tenant',
              code: 'TENANT_ACCESS_DENIED',
              request_id: securityContext.requestId
            }),
            { 
              status: 403, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      const { data: relationships, error: fetchError } = await supabase.rpc(
        'get_user_tenant_relationships',
        {
          p_user_id: userId,
          p_tenant_id: tenantId,
          p_include_inactive: includeInactive
        }
      );

      if (fetchError) {
        console.error(`[${securityContext.requestId}] Error fetching relationships:`, fetchError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to fetch relationships',
            code: 'FETCH_ERROR',
            details: fetchError.message,
            request_id: securityContext.requestId
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: relationships,
          count: relationships?.length || 0,
          request_id: securityContext.requestId,
          correlation_id: securityContext.correlationId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED',
          allowed_methods: ['GET', 'POST', 'OPTIONS'],
          request_id: securityContext.requestId
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Unexpected error in manage-user-tenant function:', error);
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
