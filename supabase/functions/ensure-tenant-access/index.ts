
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from "../_shared/cors.ts"
import { handleError } from "../_shared/errorHandler.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { tenantId } = await req.json()

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Validating tenant access for user:', user.id, 'tenant:', tenantId)

    // Check if tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError)
      return new Response(
        JSON.stringify({ 
          error: 'Tenant not found',
          details: tenantError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user-tenant relationship exists
    const { data: relationship, error: relationshipError } = await supabase
      .from('user_tenants')
      .select('id, role, is_active, metadata')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (relationshipError && relationshipError.code !== 'PGRST116') {
      console.error('Error checking user-tenant relationship:', relationshipError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check tenant relationship',
          details: relationshipError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let hasAccess = !!relationship
    let isAutoCreated = false
    let createdRelationship = null

    // If no relationship exists, create one automatically for authenticated users
    if (!relationship) {
      console.log('No relationship found, creating auto relationship...')
      
      const { data: newRelationship, error: createError } = await supabase.rpc(
        'manage_user_tenant_relationship',
        {
          p_user_id: user.id,
          p_tenant_id: tenantId,
          p_role: 'tenant_admin',
          p_is_active: true,
          p_metadata: {
            auto_created: true,
            created_via: 'ensure_tenant_access',
            created_at: new Date().toISOString()
          },
          p_operation: 'insert'
        }
      )

      if (createError) {
        console.error('Error creating user-tenant relationship:', createError)
        hasAccess = false
      } else if (newRelationship?.success) {
        console.log('Auto-created user-tenant relationship')
        hasAccess = true
        isAutoCreated = true
        createdRelationship = {
          id: newRelationship.relationship_id,
          role: 'tenant_admin',
          is_active: true,
          metadata: {
            auto_created: true,
            created_via: 'ensure_tenant_access'
          }
        }
      }
    }

    const finalRelationship = createdRelationship || relationship

    return new Response(
      JSON.stringify({
        success: true,
        hasAccess,
        relationship: finalRelationship,
        isAutoCreated,
        tenant: {
          id: tenant.id,
          name: tenant.name
        },
        message: hasAccess 
          ? (isAutoCreated 
            ? 'Access granted - relationship created automatically' 
            : 'Access granted - existing relationship found')
          : 'Access could not be established'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in ensure-tenant-access:', error)
    return handleError(error, 500)
  }
})
