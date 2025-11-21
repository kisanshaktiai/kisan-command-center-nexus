import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (level: 'info' | 'error' | 'warn', message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, data }));
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    let tenantId = url.searchParams.get('tenant_id');
    let operation = url.searchParams.get('operation') || 'limits';
    const period = url.searchParams.get('period') || '30d';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    log('info', 'Processing tenant operation', { requestId, tenantId, operation, method: req.method });

    // Handle POST requests
    if (!tenantId && req.method === 'POST') {
      try {
        const body = await req.json();
        tenantId = body?.tenantId || body?.tenant_id;
        operation = body?.operation || body?.data_type || operation;
        log('info', 'POST body parsed', { requestId, tenantId, operation });
      } catch (error) {
        log('warn', 'Failed to parse POST body', { requestId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Handle path parameters
    if (!tenantId) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 1) {
        const lastPart = pathParts[pathParts.length - 1];
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lastPart)) {
          tenantId = lastPart;
          log('info', 'Tenant ID from path', { requestId, tenantId });
        }
      }
    }

    // Validate environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      log('error', 'Missing environment variables', { requestId });
      throw new Error('Server configuration error');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      { 
        auth: { persistSession: false },
        global: { headers: { 'x-request-id': requestId } }
      }
    );

    // Validate tenant if provided
    let tenant = null;
    if (tenantId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId)) {
        return new Response(JSON.stringify({ error: 'Invalid tenant ID format' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const { data: tenantData, error: tenantError } = await supabaseClient
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenantData) {
        log('error', 'Tenant not found', { requestId, tenantId, error: tenantError });
        return new Response(JSON.stringify({ error: 'Tenant not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      tenant = tenantData;
    }

    // Route to appropriate handler
    let response;
    switch (operation) {
      // Tenant Data Operations
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
      
      // Billing Operations
      case 'billing':
      case 'subscriptions':
        response = await handleSubscriptionsBilling(supabaseClient, tenantId);
        break;
      
      default:
        return new Response(JSON.stringify({ 
          error: `Invalid operation: ${operation}`,
          valid_operations: ['limits', 'metrics', 'analytics', 'activity', 'billing', 'subscriptions']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    const duration = Date.now() - startTime;
    log('info', 'Operation completed', { requestId, operation, tenantId, duration });

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`
      },
      status: 200,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    log('error', 'Request failed', { 
      requestId, 
      duration,
      error: errorMessage,
      stack: errorStack
    });

    let statusCode = 500;
    let userMessage = 'Internal server error';

    if (errorMessage.includes('configuration')) {
      statusCode = 503;
      userMessage = 'Service temporarily unavailable';
    } else if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
      statusCode = 401;
      userMessage = 'Authentication required';
    } else if (errorMessage.includes('not found')) {
      statusCode = 404;
      userMessage = 'Resource not found';
    }

    return new Response(JSON.stringify({ 
      error: userMessage,
      message: errorMessage,
      requestId,
      timestamp: new Date().toISOString()
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Request-ID': requestId 
      },
      status: statusCode,
    });
  }
});

// ============= TENANT DATA HANDLERS =============

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

async function handleRealTimeMetrics(supabaseClient: any, tenant: any) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const { data: recentApiLogs, error: apiError } = await supabaseClient
    .from('api_logs')
    .select('status_code, response_time_ms, created_at')
    .eq('tenant_id', tenant.id)
    .gte('created_at', oneHourAgo.toISOString())
    .limit(1000);

  if (apiError) {
    log('warn', 'API logs fetch error', { error: apiError });
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

async function handleActivityFeed(supabaseClient: any, tenant: any, limit: number, offset: number) {
  const [
    apiLogsResult,
    adminAuditResult,
    securityEventsResult,
    activationLogsResult,
  ] = await Promise.all([
    supabaseClient
      .from('api_logs')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(limit / 4),

    supabaseClient
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit / 4),

    supabaseClient
      .from('security_events')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(limit / 4),

    supabaseClient
      .from('activation_logs')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(limit / 4),
  ]);

  const activities = [
    ...(apiLogsResult.data || []).map((log: any) => ({
      type: 'api_call',
      timestamp: log.created_at,
      details: log
    })),
    ...(adminAuditResult.data || []).map((log: any) => ({
      type: 'admin_action',
      timestamp: log.created_at,
      details: log
    })),
    ...(securityEventsResult.data || []).map((event: any) => ({
      type: 'security',
      timestamp: event.created_at,
      details: event
    })),
    ...(activationLogsResult.data || []).map((log: any) => ({
      type: 'activation',
      timestamp: log.created_at,
      details: log
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    activities: activities.slice(offset, offset + limit),
    total: activities.length,
    limit,
    offset
  };
}

// ============= BILLING HANDLERS =============

async function handleSubscriptionsBilling(supabaseClient: any, tenantId?: string) {
  // Build queries
  let subscriptionsQuery = supabaseClient
    .from('tenant_subscriptions')
    .select(`
      id,
      tenant_id,
      status,
      current_period_start,
      current_period_end,
      plan_id,
      billing_plans!inner (
        name,
        base_price
      ),
      tenants!inner (
        name
      )
    `);

  let paymentsQuery = supabaseClient
    .from('payment_records')
    .select('id, amount, status, created_at, payment_method')
    .order('created_at', { ascending: false })
    .limit(100);

  let invoicesQuery = supabaseClient
    .from('invoices')
    .select('id, amount, status, created_at, due_date')
    .order('created_at', { ascending: false })
    .limit(100);

  let renewalsQuery = supabaseClient
    .from('subscription_renewals')
    .select('id, renewal_date, amount, status')
    .gte('renewal_date', new Date().toISOString())
    .order('renewal_date', { ascending: true })
    .limit(100);

  // Apply tenant filter if provided
  if (tenantId) {
    subscriptionsQuery = subscriptionsQuery.eq('tenant_id', tenantId);
    paymentsQuery = paymentsQuery.eq('tenant_id', tenantId);
    invoicesQuery = invoicesQuery.eq('tenant_id', tenantId);
    renewalsQuery = renewalsQuery.eq('tenant_id', tenantId);
  }

  // Execute all queries
  const [subscriptionsResult, paymentsResult, invoicesResult, renewalsResult] = await Promise.allSettled([
    subscriptionsQuery,
    paymentsQuery,
    invoicesQuery,
    renewalsQuery
  ]);

  // Extract data with fallbacks
  const subscriptions = subscriptionsResult.status === 'fulfilled' ? subscriptionsResult.value.data : [];
  const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data : [];
  const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value.data : [];
  const renewals = renewalsResult.status === 'fulfilled' ? renewalsResult.value.data : [];

  // Log any failures
  if (subscriptionsResult.status === 'rejected') {
    log('error', 'Failed to fetch subscriptions', { error: subscriptionsResult.reason });
  }
  if (paymentsResult.status === 'rejected') {
    log('error', 'Failed to fetch payments', { error: paymentsResult.reason });
  }
  if (invoicesResult.status === 'rejected') {
    log('error', 'Failed to fetch invoices', { error: invoicesResult.reason });
  }
  if (renewalsResult.status === 'rejected') {
    log('error', 'Failed to fetch renewals', { error: renewalsResult.reason });
  }

  // Calculate billing summary
  const completedPayments = payments?.filter(p => p.status === 'completed') || [];
  const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  
  const monthlyRevenue = completedPayments
    .filter(p => new Date(p.created_at) >= thisMonthStart)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const outstandingAmount = invoices
    ?.filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + (i.amount || 0), 0) || 0;

  return {
    active_subscriptions: subscriptions?.map((sub: any) => ({
      id: sub.id,
      tenant_id: sub.tenant_id,
      tenant_name: sub.tenants?.name || 'Unknown Tenant',
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      plan_name: sub.billing_plans?.name || 'Unknown Plan',
      amount: sub.billing_plans?.base_price || 0,
      plan_type: 'standard'
    })) || [],
    payment_records: payments || [],
    invoices: invoices || [],
    upcoming_renewals: renewals || [],
    billing_summary: {
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      outstanding_amount: outstandingAmount,
    },
  };
}
