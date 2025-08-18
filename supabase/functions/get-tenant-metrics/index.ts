
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenant_id');

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('get-tenant-metrics: Fetching metrics for tenant:', tenantId);

    // Get basic tenant info
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.error('get-tenant-metrics: Error fetching tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user count for tenant
    const { data: userTenants, error: userError } = await supabaseClient
      .from('user_tenants')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const userCount = userTenants?.length || 0;

    // Return mock metrics for now - you can expand this based on your needs
    const metrics = {
      tenant_id: tenantId,
      tenant_name: tenant.name,
      user_count: userCount,
      status: tenant.status,
      subscription_plan: tenant.subscription_plan,
      created_at: tenant.created_at,
      // Add more metrics as needed
      mock_data: {
        active_farmers: Math.floor(Math.random() * 100),
        active_dealers: Math.floor(Math.random() * 20),
        total_orders: Math.floor(Math.random() * 500),
        revenue_monthly: Math.floor(Math.random() * 10000)
      }
    };

    console.log('get-tenant-metrics: Returning metrics for tenant:', tenantId);

    return new Response(
      JSON.stringify({
        success: true,
        data: metrics
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('get-tenant-metrics: Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
