import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const allowedOrigins = [
  "https://f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.lovableproject.com",
  "https://id-preview--f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.lovable.app",
  "https://f7f3ec00-3a42-4b69-b48b-a0622a7f7b10.sandbox.lovable.dev",
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

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let tenantId = url.searchParams.get('tenant_id');
    let dataType = url.searchParams.get('data_type') || 'limits';
    const period = url.searchParams.get('period') || '30d';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log(`[${new Date().toISOString()}] tenant-data: ${req.method} ${req.url}`);
    console.log(`[DEBUG] Query params - tenant_id: ${tenantId}, data_type: ${dataType}`);

    // Handle POST requests
    if (!tenantId && req.method === 'POST') {
      try {
        const body = await req.json();
        tenantId = body?.tenantId || body?.tenant_id;
        dataType = body?.data_type || dataType;
        console.log(`[DEBUG] POST body - tenant_id: ${tenantId}, data_type: ${dataType}`);
      } catch (error) {
        console.warn(`[DEBUG] Failed to parse POST body: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Handle path parameters
    if (!tenantId) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 1) {
        const lastPart = pathParts[pathParts.length - 1];
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lastPart)) {
          tenantId = lastPart;
          console.log(`[DEBUG] Path tenant_id: ${tenantId}`);
        }
      }
    }

    if (!tenantId) {
      console.error(`[ERROR] No tenant_id found`);
      return new Response(JSON.stringify({ 
        error: 'Missing tenant_id parameter',
        debug: {
          method: req.method,
          queryParams: Object.fromEntries(url.searchParams.entries()),
          pathname: url.pathname
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      console.error(`[ERROR] Invalid tenant ID format: ${tenantId}`);
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

    // Get tenant information
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error(`[ERROR] Tenant not found:`, tenantError);
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log(`[INFO] Processing ${dataType} for tenant: ${tenant.name}`);

    // Route to appropriate handler based on data_type
    let response;
    switch (dataType) {
      case 'limits':
        response = await handleLimitsQuotas(supabaseClient, tenant);
        break;
      case 'metrics':
        response = await handleRealTimeMetrics(supabaseClient, tenant);
        break;
      case 'analytics':
        response = await handleAnalytics(supabaseClient, tenant, period);
        break;
      case 'activity':
        response = await handleActivityFeed(supabaseClient, tenant, limit, offset);
        break;
      default:
        return new Response(JSON.stringify({ error: `Invalid data_type: ${dataType}. Valid types: limits, metrics, analytics, activity` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    console.log(`[INFO] Successfully processed ${dataType} for tenant ${tenantId}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`[ERROR] Exception in tenant-data:`, error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Handler for limits/quotas data
async function handleLimitsQuotas(supabaseClient: any, tenant: any) {
  const mockUsage = {
    farmers: Math.floor(Math.random() * (tenant.max_farmers || 1000)),
    dealers: Math.floor(Math.random() * (tenant.max_dealers || 50)),
    products: Math.floor(Math.random() * (tenant.max_products || 100)),
    storage: Math.floor(Math.random() * (tenant.max_storage_gb || 10)),
    api_calls: Math.floor(Math.random() * (tenant.max_api_calls_per_day || 10000)),
  };

  return {
    success: true,
    tenantId: tenant.id,
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
}

// Handler for real-time metrics
async function handleRealTimeMetrics(supabaseClient: any, tenant: any) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const { data: recentApiLogs, error: apiError } = await supabaseClient
    .from('api_logs')
    .select('status_code, response_time_ms, created_at')
    .eq('tenant_id', tenant.id)
    .gte('created_at', oneHourAgo.toISOString())
    .limit(1000);

  if (apiError) {
    console.warn(`[WARN] API logs fetch error:`, apiError);
  }

  const [farmersResult, dealersResult, productsResult] = await Promise.allSettled([
    supabaseClient.from('farmers').select('id', { count: 'exact' }).eq('tenant_id', tenant.id),
    supabaseClient.from('dealers').select('id', { count: 'exact' }).eq('tenant_id', tenant.id),
    supabaseClient.from('products').select('id', { count: 'exact' }).eq('tenant_id', tenant.id)
  ]);

  const farmersCount = farmersResult.status === 'fulfilled' && farmersResult.value.count ? farmersResult.value.count : 0;
  const dealersCount = dealersResult.status === 'fulfilled' && dealersResult.value.count ? dealersResult.value.count : 0;
  const productsCount = productsResult.status === 'fulfilled' && productsResult.value.count ? productsResult.value.count : 0;

  const defaultLimits = {
    farmers: tenant.max_farmers || (tenant.subscription_plan === 'Kisan_Basic' ? 1000 : tenant.subscription_plan === 'Shakti_Growth' ? 5000 : 20000),
    dealers: tenant.max_dealers || (tenant.subscription_plan === 'Kisan_Basic' ? 50 : tenant.subscription_plan === 'Shakti_Growth' ? 200 : 1000),
    products: 100,
    storage: tenant.max_storage_gb || (tenant.subscription_plan === 'Kisan_Basic' ? 10 : tenant.subscription_plan === 'Shakti_Growth' ? 50 : 200),
    api_calls: tenant.max_api_calls_per_day || (tenant.subscription_plan === 'Kisan_Basic' ? 10000 : tenant.subscription_plan === 'Shakti_Growth' ? 50000 : 200000)
  };

  const currentUsage = {
    farmers: farmersCount,
    dealers: dealersCount,
    products: productsCount,
    storage: Math.random() * 5,
    api_calls: recentApiLogs?.length || 0
  };

  const totalApiCalls = recentApiLogs?.length || 0;
  const errorCalls = recentApiLogs?.filter((log: any) => log.status_code >= 400).length || 0;
  const validLogs = recentApiLogs?.filter((log: any) => log.response_time_ms != null) || [];
  const avgResponseTime = validLogs.length > 0 
    ? validLogs.reduce((sum: number, log: any) => sum + (log.response_time_ms || 0), 0) / validLogs.length 
    : 0;
  const errorRate = totalApiCalls > 0 ? (errorCalls / totalApiCalls) * 100 : 0;

  const getHealthStatus = (percentage: number): 'healthy' | 'warning' | 'critical' => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'healthy';
  };

  const farmersPercentage = defaultLimits.farmers > 0 ? (currentUsage.farmers / defaultLimits.farmers) * 100 : 0;
  const dealersPercentage = defaultLimits.dealers > 0 ? (currentUsage.dealers / defaultLimits.dealers) * 100 : 0;
  const storagePercentage = defaultLimits.storage > 0 ? (currentUsage.storage / defaultLimits.storage) * 100 : 0;
  const apiPercentage = defaultLimits.api_calls > 0 ? (currentUsage.api_calls / defaultLimits.api_calls) * 100 : 0;

  const alerts = [];
  if (farmersPercentage > 80) {
    alerts.push({
      id: 'farmers_limit',
      type: 'warning',
      message: `Farmers usage is at ${farmersPercentage.toFixed(1)}% of limit`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
  }
  if (errorRate > 10) {
    alerts.push({
      id: 'high_error_rate',
      type: 'error',
      message: `High error rate detected: ${errorRate.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
  }
  if (avgResponseTime > 2000) {
    alerts.push({
      id: 'slow_response',
      type: 'warning',
      message: `Slow API response time: ${avgResponseTime.toFixed(0)}ms`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
  }

  const maxUsagePercentage = Math.max(farmersPercentage, dealersPercentage, storagePercentage, apiPercentage);
  const healthScore = Math.max(0, 100 - maxUsagePercentage);

  const generateTrend = (baseValue: number, points: number = 7): number[] => {
    return Array.from({ length: points }, (_, i) => Math.floor(baseValue * (0.8 + Math.random() * 0.4)));
  };

  return {
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
}

// Handler for analytics data
async function handleAnalytics(supabaseClient: any, tenant: any, period: string) {
  const endDate = new Date();
  const startDate = new Date();
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  startDate.setDate(endDate.getDate() - periodDays);

  const { data: apiLogs } = await supabaseClient
    .from('api_logs')
    .select('created_at, status_code, response_time_ms')
    .eq('tenant_id', tenant.id)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  const { data: activationLogs } = await supabaseClient
    .from('activation_logs')
    .select('created_at, success')
    .eq('tenant_id', tenant.id)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  const generateTimeSeries = (data: any[], dateField: string) => {
    const grouped = new Map<string, number>();
    const labels = [];
    
    for (let i = 0; i < periodDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      grouped.set(key, 0);
      labels.push(key);
    }

    data?.forEach(item => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      if (grouped.has(date)) {
        grouped.set(date, grouped.get(date)! + 1);
      }
    });

    return {
      data: Array.from(grouped.values()),
      labels,
      growth_rate: calculateGrowthRate(Array.from(grouped.values()))
    };
  };

  const calculateGrowthRate = (data: number[]) => {
    if (data.length < 2) return 0;
    const recent = data.slice(-7).reduce((a, b) => a + b, 0);
    const previous = data.slice(-14, -7).reduce((a, b) => a + b, 0);
    return previous === 0 ? 0 : ((recent - previous) / previous) * 100;
  };

  const totalApiCalls = apiLogs?.length || 0;
  const errorCalls = apiLogs?.filter((log: any) => log.status_code >= 400).length || 0;
  const avgResponseTime = (apiLogs?.reduce((sum: number, log: any) => sum + (log.response_time_ms || 0), 0) || 0) / Math.max(totalApiCalls, 1);

  return {
    usage_trends: {
      farmers: generateTimeSeries(activationLogs?.filter((log: any) => log.success) || [], 'created_at'),
      revenue: {
        data: Array.from({ length: periodDays }, (_, i) => Math.floor(Math.random() * 1000) + 500),
        labels: Array.from({ length: periodDays }, (_, i) => {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          return date.toISOString().split('T')[0];
        }),
        growth_rate: 12.5
      },
      api_usage: generateTimeSeries(apiLogs || [], 'created_at'),
      storage: {
        data: Array.from({ length: periodDays }, (_, i) => Math.floor(Math.random() * 500) + 100),
        labels: Array.from({ length: periodDays }, (_, i) => {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          return date.toISOString().split('T')[0];
        }),
        growth_rate: 8.3
      }
    },
    performance_metrics: {
      health_score: Math.max(0, 100 - (errorCalls / Math.max(totalApiCalls, 1)) * 100),
      uptime_percentage: Math.max(95, 100 - (errorCalls / Math.max(totalApiCalls, 1)) * 5),
      avg_response_time: avgResponseTime,
      error_rate: (errorCalls / Math.max(totalApiCalls, 1)) * 100,
      user_satisfaction: Math.max(70, 100 - (errorCalls / Math.max(totalApiCalls, 1)) * 30)
    },
    forecasting: {
      projected_growth: 15.2,
      churn_risk: Math.min(25, (errorCalls / Math.max(totalApiCalls, 1)) * 100),
      capacity_utilization: Math.min(100, (totalApiCalls / 1000) * 100)
    },
    comparative_analysis: {
      vs_last_month: {
        users: 12.3,
        revenue: 8.7,
        usage: 15.1
      },
      industry_benchmarks: {
        growth_rate: 10.5,
        retention_rate: 85.2
      }
    }
  };
}

// Handler for activity feed
async function handleActivityFeed(supabaseClient: any, tenant: any, limit: number, offset: number) {
  const [
    apiLogsResult,
    adminAuditResult,
    securityEventsResult,
    activationLogsResult,
    tenantDetectionResult
  ] = await Promise.all([
    supabaseClient
      .from('api_logs')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(limit / 5),

    supabaseClient
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit / 5),

    supabaseClient
      .from('security_events')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(limit / 5),

    supabaseClient
      .from('activation_logs')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(limit / 5),

    supabaseClient
      .from('tenant_detection_events')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(limit / 5)
  ]);

  const activities = [];

  if (apiLogsResult.data) {
    activities.push(...apiLogsResult.data.map((log: any) => ({
      id: log.id,
      type: 'api_activity',
      title: `API ${log.method} ${log.endpoint}`,
      description: `Status: ${log.status_code} - Response time: ${log.response_time_ms}ms`,
      timestamp: log.created_at,
      metadata: { endpoint: log.endpoint, method: log.method, status_code: log.status_code },
      severity: log.status_code >= 400 ? 'high' : 'low',
    })));
  }

  if (adminAuditResult.data) {
    activities.push(...adminAuditResult.data.map((log: any) => ({
      id: log.id,
      type: 'admin_action',
      title: `Admin Action: ${log.action}`,
      description: `Admin action performed`,
      timestamp: log.created_at,
      metadata: log.details || {},
      severity: 'medium',
      user_id: log.admin_id,
    })));
  }

  if (securityEventsResult.data) {
    activities.push(...securityEventsResult.data.map((event: any) => ({
      id: event.id,
      type: 'security_event',
      title: `Security Event: ${event.event_type}`,
      description: `Security event detected`,
      timestamp: event.created_at,
      metadata: event.metadata || {},
      severity: 'high',
      user_id: event.user_id,
    })));
  }

  if (activationLogsResult.data) {
    activities.push(...activationLogsResult.data.map((log: any) => ({
      id: log.id,
      type: 'activation',
      title: log.success ? 'Activation Successful' : 'Activation Failed',
      description: log.error_message || 'Activation code used',
      timestamp: log.created_at,
      metadata: log.metadata || {},
      severity: log.success ? 'low' : 'medium',
    })));
  }

  if (tenantDetectionResult.data) {
    activities.push(...tenantDetectionResult.data.map((event: any) => ({
      id: event.id,
      type: 'tenant_detection',
      title: `Tenant Detection: ${event.event_type}`,
      description: `Domain: ${event.domain}`,
      timestamp: event.created_at,
      metadata: event.metadata || {},
      severity: 'low',
    })));
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const paginatedActivities = activities.slice(offset, offset + limit);

  return {
    activities: paginatedActivities,
    total_count: activities.length,
    unread_count: activities.filter(a => a.severity === 'high').length,
  };
}
