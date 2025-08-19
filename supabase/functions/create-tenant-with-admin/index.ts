
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      name,
      slug,
      type = 'agri_company',
      status = 'trial',
      subscription_plan = 'Kisan_Basic',
      owner_email,
      owner_name,
      metadata = {}
    } = await req.json();

    console.log('Creating tenant with system roles validation:', { name, slug, type, owner_email });

    // Validate required fields
    if (!name || !slug || !owner_email || !owner_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: name, slug, owner_email, owner_name' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate that tenant_owner role exists and is active in system_roles
    const { data: ownerRole, error: roleError } = await supabaseClient
      .from('system_roles')
      .select('role_code, is_active')
      .eq('role_code', 'tenant_owner')
      .eq('is_active', true)
      .single();

    if (roleError || !ownerRole) {
      console.error('Tenant owner role not found or inactive:', roleError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tenant owner role is not available in the system' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check slug availability using the database function
    const { data: slugCheck, error: slugError } = await supabaseClient
      .rpc('check_slug_availability', { p_slug: slug });

    if (slugError) {
      console.error('Error checking slug availability:', slugError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to validate slug' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!slugCheck?.available) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: slugCheck?.error || 'Slug is not available' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get subscription plan limits based on system configuration
    const planLimits = getPlanLimits(subscription_plan);

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        type,
        status,
        subscription_plan,
        owner_name: owner_name.trim(),
        owner_email: owner_email.trim(),
        max_farmers: planLimits.farmers,
        max_dealers: planLimits.dealers,
        max_products: planLimits.products,
        max_storage_gb: planLimits.storage,
        max_api_calls_per_day: planLimits.api_calls,
        metadata: {
          ...metadata,
          created_via: 'admin_ui',
          creation_timestamp: new Date().toISOString(),
          system_roles_version: '1.0'
        }
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create tenant' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Tenant created successfully with system roles integration:', tenant.id);

    // Create invitation for tenant owner using system role
    const invitationToken = crypto.randomUUID();
    const { error: invitationError } = await supabaseClient
      .from('user_invitations')
      .insert({
        tenant_id: tenant.id,
        email: owner_email.trim(),
        invitation_type: 'tenant_owner',
        invitation_token: invitationToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        metadata: {
          tenant_name: name,
          role_source: 'system_roles_table',
          system_role_code: 'tenant_owner'
        }
      });

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      // Don't fail the whole operation, just log the warning
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: {
          tenant,
          invitation_token: invitationToken,
          system_roles_enabled: true
        },
        message: 'Tenant created successfully with system roles integration'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in create-tenant-with-admin:', error);
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

function getPlanLimits(subscriptionPlan: string) {
  const limits = {
    'Kisan_Basic': { farmers: 1000, dealers: 50, products: 100, storage: 10, api_calls: 10000 },
    'Shakti_Growth': { farmers: 5000, dealers: 200, products: 500, storage: 50, api_calls: 50000 },
    'AI_Enterprise': { farmers: 20000, dealers: 1000, products: 2000, storage: 200, api_calls: 200000 },
    'Custom': { farmers: 50000, dealers: 2000, products: 5000, storage: 500, api_calls: 500000 }
  };
  
  return limits[subscriptionPlan as keyof typeof limits] || limits['Kisan_Basic'];
}
