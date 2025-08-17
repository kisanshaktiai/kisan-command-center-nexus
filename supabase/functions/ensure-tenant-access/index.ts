
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    console.log('Ensuring tenant access for user:', user.id, 'tenant:', tenantId)

    // Call the database function to ensure access
    const { data: accessResult, error: accessError } = await supabase
      .rpc('ensure_user_tenant_access', {
        p_tenant_id: tenantId,
        p_user_id: user.id
      })

    if (accessError) {
      console.error('Error ensuring tenant access:', accessError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to ensure tenant access',
          details: accessError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user-tenant relationship exists
    const { data: relationship, error: relationshipError } = await supabase
      .from('user_tenants')
      .select('id, role, is_active, metadata')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

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

    const hasAccess = accessResult && relationship
    const isAutoCreated = relationship?.metadata?.auto_created || false

    return new Response(
      JSON.stringify({
        success: true,
        hasAccess,
        relationship: relationship || null,
        isAutoCreated,
        message: hasAccess 
          ? (isAutoCreated 
            ? 'Access granted - relationship auto-created' 
            : 'Access granted - existing relationship')
          : 'Access denied'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
