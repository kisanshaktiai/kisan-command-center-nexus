
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LimitsQuotasResponse {
  limits: {
    farmers: number;
    dealers: number;
    products: number;
    storage: number;
    api_calls: number;
  };
  usage: {
    farmers: number;
    dealers: number;
    products: number;
    storage: number;
    api_calls: number;
  };
  subscription_plan: string;
  tenant_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.pathname.split('/')[3]; // Extract tenant ID from path

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Tenant ID is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get tenant details with limits
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select(`
        id,
        subscription_plan,
        max_farmers,
        max_dealers,
        max_products,
        max_storage_gb,
        max_api_calls_per_day
      `)
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Get current usage counts
    const [farmersCount, dealersCount, apiLogsCount] = await Promise.all([
      supabaseClient.from('farmers').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
      supabaseClient.from('dealers').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
      supabaseClient.from('api_logs').select('id', { count: 'exact' }).eq('tenant_id', tenantId).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    const response: LimitsQuotasResponse = {
      limits: {
        farmers: tenant.max_farmers || 0,
        dealers: tenant.max_dealers || 0,
        products: tenant.max_products || 0,
        storage: tenant.max_storage_gb || 0,
        api_calls: tenant.max_api_calls_per_day || 0,
      },
      usage: {
        farmers: farmersCount.count || 0,
        dealers: dealersCount.count || 0,
        products: 0, // Would need products table
        storage: 0, // Would need storage calculation
        api_calls: apiLogsCount.count || 0,
      },
      subscription_plan: tenant.subscription_plan,
      tenant_id: tenantId,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in tenant-limits-quotas:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
