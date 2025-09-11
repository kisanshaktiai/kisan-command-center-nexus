import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenant_id');
    const tenantSlug = url.searchParams.get('tenant_slug');

    if (!tenantId && !tenantSlug) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Either tenant_id or tenant_slug is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, get tenant ID if slug was provided
    let finalTenantId = tenantId;
    if (!finalTenantId && tenantSlug) {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single();

      if (tenantError || !tenant) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Tenant not found'
          }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      finalTenantId = tenant.id;
    }

    // Fetch white label config using the database function
    const { data: config, error: configError } = await supabase
      .rpc('get_mobile_white_label_config', { p_tenant_id: finalTenantId });

    if (configError) {
      console.error('Error fetching config:', configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch configuration'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update last synced timestamp
    await supabase
      .from('white_label_configs')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('tenant_id', finalTenantId);

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});