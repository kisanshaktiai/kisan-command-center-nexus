
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
  health_score?: number;
  last_activity?: string;
  trends?: {
    farmers: number[];
    revenue: number[];
    apiUsage: number[];
  };
  usage?: {
    farmers: number;
    dealers: number;
    products: number;
    storage: number;
    api_calls: number;
  };
  limits?: {
    farmers: number;
    dealers: number;
    products: number;
    storage: number;
    api_calls: number;
  };
}

const allowedOrigins = [
  "https://f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.lovableproject.com", // production
  "https://id-preview--f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.lovable.app", // preview
];

function getCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, referrer-policy",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "*";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Validate tenant_id parameter
const url = new URL(req.url);
let tenantId = url.searchParams.get('tenant_id');

if (!tenantId && req.method === 'POST') {
  try {
    const body = await req.json();
    tenantId = body?.tenant_id;
  } catch {
    // ignore parse errors
  }
}

if (!tenantId) {
  return new Response(JSON.stringify({ error: 'Missing tenant_id parameter' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 400,
  });
}

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return new Response(JSON.stringify({ error: 'Invalid tenant ID format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get tenant information with proper error handling
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, name, status, max_farmers, max_dealers, max_storage_gb, max_api_calls_per_day, subscription_plan')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant lookup error:', tenantError);
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Get recent API activity (last hour) with error handling
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: recentApiLogs, error: apiError } = await supabaseClient
      .from('api_logs')
      .select('status_code, response_time_ms, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', oneHourAgo.toISOString())
      .limit(1000);

    if (apiError) {
      console.warn('API logs fetch error:', apiError);
    }

    // Get current usage counts with fallbacks
    const [farmersResult, dealersResult, productsResult] = await Promise.allSettled([
      supabaseClient.from('farmers').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
      supabaseClient.from('dealers').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
      supabaseClient.from('products').select('id', { count: 'exact' }).eq('tenant_id', tenantId)
    ]);

    // Extract counts safely
    const farmersCount = farmersResult.status === 'fulfilled' && farmersResult.value.count ? farmersResult.value.count : 0;
    const dealersCount = dealersResult.status === 'fulfilled' && dealersResult.value.count ? dealersResult.value.count : 0;
    const productsCount = productsResult.status === 'fulfilled' && productsResult.value.count ? productsResult.value.count : 0;

    // Set default limits based on subscription plan
    const defaultLimits = {
      farmers: tenant.max_farmers || (tenant.subscription_plan === 'Kisan_Basic' ? 1000 : tenant.subscription_plan === 'Shakti_Growth' ? 5000 : 20000),
      dealers: tenant.max_dealers || (tenant.subscription_plan === 'Kisan_Basic' ? 50 : tenant.subscription_plan === 'Shakti_Growth' ? 200 : 1000),
      products: 100,
      storage: tenant.max_storage_gb || (tenant.subscription_plan === 'Kisan_Basic' ? 10 : tenant.subscription_plan === 'Shakti_Growth' ? 50 : 200),
      api_calls: tenant.max_api_calls_per_day || (tenant.subscription_plan === 'Kisan_Basic' ? 10000 : tenant.subscription_plan === 'Shakti_Growth' ? 50000 : 200000)
    };

    // Calculate usage
    const currentUsage = {
      farmers: farmersCount,
      dealers: dealersCount,
      products: productsCount,
      storage: Math.random() * 5, // Simulated for now
      api_calls: recentApiLogs?.length || 0
    };

    // Calculate metrics
    const totalApiCalls = recentApiLogs?.length || 0;
    const errorCalls = recentApiLogs?.filter(log => log.status_code >= 400).length || 0;
    const validLogs = recentApiLogs?.filter(log => log.response_time_ms != null) || [];
    const avgResponseTime = validLogs.length > 0 
      ? validLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / validLogs.length 
      : 0;
    const errorRate = totalApiCalls > 0 ? (errorCalls / totalApiCalls) * 100 : 0;

    // Health indicators
    const getHealthStatus = (percentage: number): 'healthy' | 'warning' | 'critical' => {
      if (percentage >= 90) return 'critical';
      if (percentage >= 75) return 'warning';
      return 'healthy';
    };

    const farmersPercentage = defaultLimits.farmers > 0 ? (currentUsage.farmers / defaultLimits.farmers) * 100 : 0;
    const dealersPercentage = defaultLimits.dealers > 0 ? (currentUsage.dealers / defaultLimits.dealers) * 100 : 0;
    const storagePercentage = defaultLimits.storage > 0 ? (currentUsage.storage / defaultLimits.storage) * 100 : 0;
    const apiPercentage = defaultLimits.api_calls > 0 ? (currentUsage.api_calls / defaultLimits.api_calls) * 100 : 0;

    // Generate alerts
    const alerts = [];
    if (farmersPercentage > 80) {
      alerts.push({
        id: 'farmers_limit',
        type: 'warning' as const,
        message: `Farmers usage is at ${farmersPercentage.toFixed(1)}% of limit`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
    if (errorRate > 10) {
      alerts.push({
        id: 'high_error_rate',
        type: 'error' as const,
        message: `High error rate detected: ${errorRate.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
    if (avgResponseTime > 2000) {
      alerts.push({
        id: 'slow_response',
        type: 'warning' as const,
        message: `Slow API response time: ${avgResponseTime.toFixed(0)}ms`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }

    // Calculate overall health score
    const maxUsagePercentage = Math.max(farmersPercentage, dealersPercentage, storagePercentage, apiPercentage);
    const healthScore = Math.max(0, 100 - maxUsagePercentage);

    // Generate mock trends for consistency
    const generateTrend = (baseValue: number, points: number = 7): number[] => {
      return Array.from({ length: points }, (_, i) => Math.floor(baseValue * (0.8 + Math.random() * 0.4)));
    };

    const response: RealTimeMetricsResponse = {
      current_metrics: {
        active_users: Math.floor(Math.random() * 100) + 10,
        api_calls_last_hour: totalApiCalls,
        error_rate: errorRate,
        response_time_avg: avgResponseTime,
        storage_usage_mb: currentUsage.storage * 1024,
        bandwidth_usage_mb: Math.floor(Math.random() * 1000) + 100
      },
      health_indicators: {
        system_health: getHealthStatus(maxUsagePercentage),
        database_health: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'warning' : 'critical',
        api_health: avgResponseTime < 1000 ? 'healthy' : avgResponseTime < 3000 ? 'warning' : 'critical',
        storage_health: getHealthStatus(storagePercentage)
      },
      alerts,
      capacity_status: {
        farmers_usage: {
          current: currentUsage.farmers,
          limit: defaultLimits.farmers,
          percentage: farmersPercentage
        },
        dealers_usage: {
          current: currentUsage.dealers,
          limit: defaultLimits.dealers,
          percentage: dealersPercentage
        },
        storage_usage: {
          current: currentUsage.storage,
          limit: defaultLimits.storage,
          percentage: storagePercentage
        },
        api_usage: {
          current: currentUsage.api_calls,
          limit: defaultLimits.api_calls,
          percentage: apiPercentage
        }
      },
      health_score: healthScore,
      last_activity: new Date().toISOString(),
      trends: {
        farmers: generateTrend(currentUsage.farmers),
        revenue: generateTrend(2500),
        apiUsage: generateTrend(currentUsage.api_calls)
      },
      usage: currentUsage,
      limits: defaultLimits
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in tenant-real-time-metrics:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
