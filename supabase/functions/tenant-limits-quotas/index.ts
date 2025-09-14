
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
    );

    const { tenantId } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tenant ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError);
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

    // Mock usage data - in a real application, you would query actual usage from various tables
    const mockUsage = {
      farmers: Math.floor(Math.random() * (tenant.max_farmers || 1000)),
      dealers: Math.floor(Math.random() * (tenant.max_dealers || 50)),
      products: Math.floor(Math.random() * (tenant.max_products || 100)),
      storage: Math.floor(Math.random() * (tenant.max_storage_gb || 10)),
      api_calls: Math.floor(Math.random() * (tenant.max_api_calls_per_day || 10000)),
    };

    const response = {
      success: true,
      tenantId,
      limits: {
        farmers: tenant.max_farmers || 1000,
        dealers: tenant.max_dealers || 50,
        products: tenant.max_products || 100,
        storage: tenant.max_storage_gb || 10,
        api_calls: tenant.max_api_calls_per_day || 10000,
      },
      usage: mockUsage,
      quotas: {
        farmers_percentage: (mockUsage.farmers / (tenant.max_farmers || 1000)) * 100,
        dealers_percentage: (mockUsage.dealers / (tenant.max_dealers || 50)) * 100,
        products_percentage: (mockUsage.products / (tenant.max_products || 100)) * 100,
        storage_percentage: (mockUsage.storage / (tenant.max_storage_gb || 10)) * 100,
        api_calls_percentage: (mockUsage.api_calls / (tenant.max_api_calls_per_day || 10000)) * 100,
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in tenant-limits-quotas:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
