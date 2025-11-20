import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { tenantId } = await req.json()

    if (!tenantId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'tenantId is required' 
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔄 Syncing tenant domains for:', tenantId)

    // Fetch white_label_config
    const { data: wlConfig, error: wlError } = await supabaseAdmin
      .from('white_label_configs')
      .select('id, domain_config, brand_identity')
      .eq('tenant_id', tenantId)
      .single()

    if (wlError || !wlConfig) {
      console.error('❌ White-label config not found:', wlError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'White-label config not found' 
        }), 
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('📋 Found config:', {
      id: wlConfig.id,
      domainConfig: wlConfig.domain_config
    })

    // Fetch current tenant metadata
    const { data: currentTenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single()

    const currentMetadata = (currentTenant?.metadata as any) || {}

    // Update tenant (bypasses RLS with service_role)
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({ 
        domain_config: wlConfig.domain_config,
        metadata: {
          ...currentMetadata,
          branding_synced_from_wl: true,
          branding_sync_at: new Date().toISOString(),
          white_label_config_id: wlConfig.id
        }
      })
      .eq('id', tenantId)
      .select()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: updateError.message 
        }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!updateData || updateData.length === 0) {
      console.error('❌ No rows updated')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No rows were updated' 
        }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Successfully synced domain_config:', updateData[0].domain_config)

    return new Response(
      JSON.stringify({ 
        success: true,
        data: updateData[0]
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error' 
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
