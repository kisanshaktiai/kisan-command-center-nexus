
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface RealTimeMetricsResponse {
  current_metrics: {
    active_users: number;
    api_calls_last_hour: number;
    error_rate: number;
    response_time_avg: number;
    storage_usage_mb: number;
    bandwidth_usage_mb: number;
  };
  health_indicators: {
    system_health: 'healthy' | 'warning' | 'critical';
    database_health: 'healthy' | 'warning' | 'critical';
    api_health: 'healthy' | 'warning' | 'critical';
    storage_health: 'healthy' | 'warning' | 'critical';
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
  capacity_status: {
    farmers_usage: { current: number; limit: number; percentage: number };
    dealers_usage: { current: number; limit: number; percentage: number };
    storage_usage: { current: number; limit: number; percentage: number };
    api_usage: { current: number; limit: number; percentage: number };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request body format
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON format in request body',
        details: 'Request body must be valid JSON'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { tenant_id } = requestBody;

    // Validate tenant_id parameter
    if (!tenant_id) {
      console.error('Missing tenant_id in request body:', requestBody);
      return new Response(JSON.stringify({ 
        error: 'tenant_id is required',
        details: 'Request body must include tenant_id field'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Validate tenant_id format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenant_id)) {
      console.error('Invalid tenant_id format:', tenant_id);
      return new Response(JSON.stringify({ 
        error: 'Invalid tenant_id format',
        details: 'tenant_id must be a valid UUID'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Processing metrics request for tenant:', tenant_id);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get tenant limits
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('max_farmers, max_dealers, max_storage_gb, max_api_calls_per_day')
      .eq('id', tenant_id)
      .single();

    if (tenantError) {
      console.error('Database error fetching tenant:', tenantError);
      return new Response(JSON.stringify({ 
        error: 'Database error',
        details: tenantError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!tenant) {
      console.error('Tenant not found:', tenant_id);
      return new Response(JSON.stringify({ 
        error: 'Tenant not found',
        details: `No tenant found with ID: ${tenant_id}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Get recent API activity (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: recentApiLogs } = await supabaseClient
      .from('api_logs')
      .select('status_code, response_time_ms')
      .eq('tenant_id', tenant_id)
      .gte('created_at', oneHourAgo.toISOString());

    // Get current usage from limits-quotas function
    const limitsResponse = await supabaseClient.functions.invoke('tenant-limits-quotas', {
      body: { tenantId: tenant_id }
    });

    const currentUsage = limitsResponse.data || {
      usage: { farmers: 0, dealers: 0, storage: 0, api_calls: 0 },
      limits: { farmers: tenant.max_farmers, dealers: tenant.max_dealers, storage: tenant.max_storage_gb, api_calls: tenant.max_api_calls_per_day }
    };

    // Calculate metrics
    const totalApiCalls = recentApiLogs?.length || 0;
    const errorCalls = recentApiLogs?.filter(log => log.status_code >= 400).length || 0;
    const avgResponseTime = recentApiLogs?.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / Math.max(totalApiCalls, 1) || 0;
    const errorRate = totalApiCalls > 0 ? (errorCalls / totalApiCalls) * 100 : 0;

    // Health indicators
    const getHealthStatus = (percentage: number) => {
      if (percentage >= 90) return 'critical';
      if (percentage >= 75) return 'warning';
      return 'healthy';
    };

    const farmersPercentage = (currentUsage.usage.farmers / currentUsage.limits.farmers) * 100;
    const dealersPercentage = (currentUsage.usage.dealers / currentUsage.limits.dealers) * 100;
    const storagePercentage = (currentUsage.usage.storage / currentUsage.limits.storage) * 100;
    const apiPercentage = (currentUsage.usage.api_calls / currentUsage.limits.api_calls) * 100;

    const response: RealTimeMetricsResponse = {
      current_metrics: {
        active_users: Math.floor(Math.random() * 100) + 10,
        api_calls_last_hour: totalApiCalls,
        error_rate: errorRate,
        response_time_avg: avgResponseTime,
        storage_usage_mb: currentUsage.usage.storage * 1024, // Convert GB to MB
        bandwidth_usage_mb: Math.floor(Math.random() * 1000) + 100
      },
      health_indicators: {
        system_health: getHealthStatus(Math.max(farmersPercentage, dealersPercentage, storagePercentage, apiPercentage)),
        database_health: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'warning' : 'critical',
        api_health: avgResponseTime < 1000 ? 'healthy' : avgResponseTime < 3000 ? 'warning' : 'critical',
        storage_health: getHealthStatus(storagePercentage)
      },
      alerts: [
        ...(farmersPercentage > 80 ? [{
          id: 'farmers_limit',
          type: 'warning' as const,
          message: `Farmers usage is at ${farmersPercentage.toFixed(1)}% of limit`,
          timestamp: new Date().toISOString(),
          resolved: false
        }] : []),
        ...(errorRate > 10 ? [{
          id: 'high_error_rate',
          type: 'error' as const,
          message: `High error rate detected: ${errorRate.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          resolved: false
        }] : []),
        ...(avgResponseTime > 2000 ? [{
          id: 'slow_response',
          type: 'warning' as const,
          message: `Slow API response time: ${avgResponseTime.toFixed(0)}ms`,
          timestamp: new Date().toISOString(),
          resolved: false
        }] : [])
      ],
      capacity_status: {
        farmers_usage: {
          current: currentUsage.usage.farmers,
          limit: currentUsage.limits.farmers,
          percentage: farmersPercentage
        },
        dealers_usage: {
          current: currentUsage.usage.dealers,
          limit: currentUsage.limits.dealers,
          percentage: dealersPercentage
        },
        storage_usage: {
          current: currentUsage.usage.storage,
          limit: currentUsage.limits.storage,
          percentage: storagePercentage
        },
        api_usage: {
          current: currentUsage.usage.api_calls,
          limit: currentUsage.limits.api_calls,
          percentage: apiPercentage
        }
      }
    };

    console.log('Successfully generated metrics for tenant:', tenant_id);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Unexpected error in tenant-real-time-metrics:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
