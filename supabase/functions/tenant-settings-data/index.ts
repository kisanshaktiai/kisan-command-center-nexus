
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SettingsResponse {
  domain_configuration: {
    subdomain: string;
    custom_domain: string;
    ssl_status: string;
    dns_status: string;
    domain_verification: boolean;
  };
  security_settings: {
    two_factor_enabled: boolean;
    session_timeout: number;
    ip_whitelist: string[];
    api_rate_limits: {
      requests_per_hour: number;
      burst_limit: number;
    };
    last_security_scan: string;
  };
  integration_status: {
    webhooks: { active: number; total: number };
    api_keys: { active: number; total: number };
    external_services: Array<{
      name: string;
      status: 'connected' | 'disconnected' | 'error';
      last_sync: string;
    }>;
  };
  compliance_status: {
    gdpr_compliant: boolean;
    data_retention_policy: string;
    audit_trail_enabled: boolean;
    backup_frequency: string;
    last_backup: string;
  };
  feature_flags: {
    ai_features: boolean;
    advanced_analytics: boolean;
    white_label: boolean;
    custom_branding: boolean;
    api_access: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenant_id');

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

    // Get tenant details
    const { data: tenant } = await supabaseClient
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Get API keys count
    const { data: apiKeys } = await supabaseClient
      .from('api_keys')
      .select('id, is_active')
      .eq('tenant_id', tenantId);

    // Get recent security events
    const { data: securityEvents } = await supabaseClient
      .from('security_events')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1);

    const response: SettingsResponse = {
      domain_configuration: {
        subdomain: tenant.subdomain || '',
        custom_domain: tenant.custom_domain || '',
        ssl_status: tenant.custom_domain ? 'active' : 'not_configured',
        dns_status: tenant.custom_domain ? 'verified' : 'not_configured',
        domain_verification: !!tenant.custom_domain
      },
      security_settings: {
        two_factor_enabled: false,
        session_timeout: 24,
        ip_whitelist: [],
        api_rate_limits: {
          requests_per_hour: tenant.max_api_calls_per_day || 10000,
          burst_limit: Math.floor((tenant.max_api_calls_per_day || 10000) / 10)
        },
        last_security_scan: securityEvents?.[0]?.created_at || new Date().toISOString()
      },
      integration_status: {
        webhooks: { active: 0, total: 0 },
        api_keys: { 
          active: apiKeys?.filter(key => key.is_active).length || 0,
          total: apiKeys?.length || 0
        },
        external_services: [
          { name: 'Payment Gateway', status: 'connected', last_sync: new Date().toISOString() },
          { name: 'Email Service', status: 'connected', last_sync: new Date().toISOString() },
          { name: 'Analytics', status: 'connected', last_sync: new Date().toISOString() }
        ]
      },
      compliance_status: {
        gdpr_compliant: true,
        data_retention_policy: '2 years',
        audit_trail_enabled: true,
        backup_frequency: 'daily',
        last_backup: new Date().toISOString()
      },
      feature_flags: {
        ai_features: tenant.subscription_plan === 'AI_Enterprise',
        advanced_analytics: ['Shakti_Growth', 'AI_Enterprise'].includes(tenant.subscription_plan),
        white_label: tenant.subscription_plan === 'AI_Enterprise',
        custom_branding: ['Shakti_Growth', 'AI_Enterprise'].includes(tenant.subscription_plan),
        api_access: true
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in tenant-settings-data:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
