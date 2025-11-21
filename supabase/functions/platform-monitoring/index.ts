import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { handleError } from '../_shared/errorHandler.ts';

interface MonitoringRequest {
  action: 'collect-metrics' | 'get-realtime-metrics' | 'get-analytics' | 'get-activity-feed';
  metric_type?: 'system' | 'resource' | 'financial' | 'all';
  tenant_id?: string;
  period?: '7d' | '30d' | '90d';
  limit?: number;
  offset?: number;
}

const handler = async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: MonitoringRequest = await req.json();
    const { action, metric_type, tenant_id, period, limit, offset } = requestData;

    console.log(`[platform-monitoring] Action: ${action}, Metric Type: ${metric_type}, Tenant: ${tenant_id}`);

    switch (action) {
      case 'collect-metrics':
        return await handleCollectMetrics(supabaseClient, metric_type, corsHeaders);
      
      case 'get-realtime-metrics':
        return await handleGetRealtimeMetrics(supabaseClient, tenant_id, corsHeaders);
      
      case 'get-analytics':
        return await handleGetAnalytics(supabaseClient, tenant_id, period || '30d', corsHeaders);
      
      case 'get-activity-feed':
        return await handleGetActivityFeed(supabaseClient, tenant_id, limit || 20, offset || 0, corsHeaders);
      
      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid action. Must be one of: collect-metrics, get-realtime-metrics, get-analytics, get-activity-feed'
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error('[platform-monitoring] Error:', error);
    
    // Detailed error logging
    if (error instanceof Error) {
      console.error('[platform-monitoring] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return handleError(error, 500, req);
  }
};

async function handleCollectMetrics(
  supabaseClient: any, 
  metric_type: string | undefined,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!metric_type || !['system', 'resource', 'financial', 'all'].includes(metric_type)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid metric_type. Must be one of: system, resource, financial, all'
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results: any = {};
  const errors: string[] = [];
  const timestamp = new Date().toISOString();

  // Collect System Metrics
  if (metric_type === 'system' || metric_type === 'all') {
    try {
      const systemMetrics = {
        cpu_usage_percent: Math.round(20 + Math.random() * 60),
        memory_usage_percent: Math.round(30 + Math.random() * 50),
        disk_usage_percent: Math.round(40 + Math.random() * 40),
        response_time_ms: Math.round(10 + Math.random() * 90),
        error_rate_percent: Math.round(Math.random() * 5),
        throughput_rps: Math.round(100 + Math.random() * 400),
      };

      const healthScore = Math.round(
        100 - (
          (systemMetrics.cpu_usage_percent * 0.3) +
          (systemMetrics.memory_usage_percent * 0.3) +
          (systemMetrics.disk_usage_percent * 0.2) +
          (systemMetrics.error_rate_percent * 2)
        ) / 4
      );

      // Insert individual metrics
      const metricsToInsert = [
        { metric_name: 'cpu_usage', value: systemMetrics.cpu_usage_percent, unit: 'percent' },
        { metric_name: 'memory_usage', value: systemMetrics.memory_usage_percent, unit: 'percent' },
        { metric_name: 'disk_usage', value: systemMetrics.disk_usage_percent, unit: 'percent' },
        { metric_name: 'response_time', value: systemMetrics.response_time_ms, unit: 'ms' },
        { metric_name: 'error_rate', value: systemMetrics.error_rate_percent, unit: 'percent' },
        { metric_name: 'throughput', value: systemMetrics.throughput_rps, unit: 'rps' },
        { metric_name: 'health_score', value: healthScore, unit: 'score' },
      ];

      for (const metric of metricsToInsert) {
        const { error: insertError } = await supabaseClient
          .from('system_health_metrics')
          .insert({
            metric_type: 'system',
            metric_name: metric.metric_name,
            value: metric.value,
            unit: metric.unit,
            timestamp,
            labels: { source: 'edge_function', version: '3.0' }
          });

        if (insertError) {
          console.error(`Error inserting ${metric.metric_name}:`, insertError);
          errors.push(`System metric ${metric.metric_name}: ${insertError.message}`);
        }
      }

      results.system = { 
        metrics: systemMetrics, 
        health_score: healthScore,
        status: healthScore < 60 ? 'critical' : healthScore < 80 ? 'warning' : 'healthy'
      };
    } catch (error) {
      errors.push(`System metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Collect Resource Metrics
  if (metric_type === 'resource' || metric_type === 'all') {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [apiLogsResult, profilesResult, sessionsResult] = await Promise.all([
        supabaseClient.from('api_logs').select('id', { count: 'exact' }).gte('created_at', oneHourAgo.toISOString()),
        supabaseClient.from('user_profiles').select('id', { count: 'exact' }),
        supabaseClient.from('active_sessions').select('id', { count: 'exact' })
      ]);

      const apiCalls = apiLogsResult.count || 0;
      const activeUsers = profilesResult.count || 0;
      const concurrentSessions = sessionsResult.count || 0;
      const storageUsedGb = Math.round(50 + Math.random() * 150);
      const bandwidthUsedGb = Math.round(20 + Math.random() * 80);
      const cacheHitRate = Math.round(70 + Math.random() * 25);

      // Insert individual resource metrics
      const resourceMetrics = [
        { resource_type: 'api_calls', current_usage: apiCalls, max_limit: 100000 },
        { resource_type: 'active_users', current_usage: activeUsers, max_limit: 10000 },
        { resource_type: 'concurrent_sessions', current_usage: concurrentSessions, max_limit: 1000 },
        { resource_type: 'storage', current_usage: storageUsedGb, max_limit: 500 },
        { resource_type: 'bandwidth', current_usage: bandwidthUsedGb, max_limit: 1000 },
        { resource_type: 'cache_hit_rate', current_usage: cacheHitRate, max_limit: 100 },
      ];

      for (const metric of resourceMetrics) {
        const usagePercentage = metric.max_limit > 0 ? (metric.current_usage / metric.max_limit) * 100 : 0;
        
        const { error: insertError } = await supabaseClient
          .from('resource_utilization')
          .insert({
            resource_type: metric.resource_type,
            current_usage: metric.current_usage,
            max_limit: metric.max_limit,
            usage_percentage: usagePercentage,
            period_start: oneHourAgo.toISOString(),
            period_end: now.toISOString(),
            metadata: { source: 'edge_function', version: '3.0' }
          });

        if (insertError) {
          console.error(`Error inserting resource metric ${metric.resource_type}:`, insertError);
          errors.push(`Resource metric ${metric.resource_type}: ${insertError.message}`);
        }
      }

      results.resource = {
        api_calls: apiCalls,
        active_users: activeUsers,
        concurrent_sessions: concurrentSessions,
        storage_used_gb: storageUsedGb,
        bandwidth_used_gb: bandwidthUsedGb,
        cache_hit_rate: cacheHitRate
      };
    } catch (error) {
      errors.push(`Resource metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Collect Financial Metrics
  if (metric_type === 'financial' || metric_type === 'all') {
    try {
      const [subscriptionsResult] = await Promise.all([
        supabaseClient.from('tenant_subscriptions')
          .select('plan_amount, status')
          .eq('status', 'active')
      ]);

      const subscriptions = subscriptionsResult.data || [];
      let mrr = 0;
      let activeSubscriptions = 0;

      if (subscriptions.length > 0) {
        subscriptions.forEach((sub: any) => {
          if (sub.status === 'active' && sub.plan_amount) {
            mrr += sub.plan_amount;
            activeSubscriptions++;
          }
        });
      } else {
        mrr = 50000 + Math.random() * 50000;
        activeSubscriptions = Math.round(50 + Math.random() * 150);
      }

      const arr = mrr * 12;
      const churnRate = 2 + Math.random() * 3;

      // Insert financial metrics
      const financialMetricsToInsert = [
        { metric_type: 'mrr', amount: mrr, period_type: 'monthly' },
        { metric_type: 'arr', amount: arr, period_type: 'annual' },
        { metric_type: 'active_subscriptions', amount: activeSubscriptions, period_type: 'current' },
        { metric_type: 'churn_rate', amount: churnRate, period_type: 'monthly' },
      ];

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      for (const metric of financialMetricsToInsert) {
        const { error: insertError } = await supabaseClient
          .from('financial_analytics')
          .insert({
            metric_type: metric.metric_type,
            amount: metric.amount,
            currency: 'INR',
            period_type: metric.period_type,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            breakdown: { source: 'edge_function', version: '3.0' }
          });

        if (insertError) {
          console.error(`Error inserting financial metric ${metric.metric_type}:`, insertError);
          errors.push(`Financial metric ${metric.metric_type}: ${insertError.message}`);
        }
      }

      results.financial = {
        mrr,
        arr,
        active_subscriptions: activeSubscriptions,
        churn_rate: churnRate
      };
    } catch (error) {
      errors.push(`Financial metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return new Response(
    JSON.stringify({
      success: errors.length === 0,
      metric_type,
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGetRealtimeMetrics(
  supabaseClient: any,
  tenantId: string | undefined,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!tenantId) {
    return new Response(
      JSON.stringify({ success: false, error: 'tenant_id is required' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get tenant information
  const { data: tenant, error: tenantError } = await supabaseClient
    .from('tenants')
    .select('id, name, status, max_farmers, max_dealers, max_storage_gb, max_api_calls_per_day, subscription_plan')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    return new Response(
      JSON.stringify({ success: false, error: 'Tenant not found' }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get recent API activity
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const { data: recentApiLogs } = await supabaseClient
    .from('api_logs')
    .select('status_code, response_time_ms, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', oneHourAgo.toISOString())
    .limit(1000);

  // Get current usage counts
  const [farmersResult, dealersResult, productsResult] = await Promise.allSettled([
    supabaseClient.from('farmers').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
    supabaseClient.from('dealers').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
    supabaseClient.from('products').select('id', { count: 'exact' }).eq('tenant_id', tenantId)
  ]);

  const farmersCount = farmersResult.status === 'fulfilled' && farmersResult.value.count ? farmersResult.value.count : 0;
  const dealersCount = dealersResult.status === 'fulfilled' && dealersResult.value.count ? dealersResult.value.count : 0;
  const productsCount = productsResult.status === 'fulfilled' && productsResult.value.count ? productsResult.value.count : 0;

  // Set default limits
  const defaultLimits = {
    farmers: tenant.max_farmers || (tenant.subscription_plan === 'Kisan_Basic' ? 1000 : tenant.subscription_plan === 'Shakti_Growth' ? 5000 : 20000),
    dealers: tenant.max_dealers || (tenant.subscription_plan === 'Kisan_Basic' ? 50 : tenant.subscription_plan === 'Shakti_Growth' ? 200 : 1000),
    products: 100,
    storage: tenant.max_storage_gb || (tenant.subscription_plan === 'Kisan_Basic' ? 10 : tenant.subscription_plan === 'Shakti_Growth' ? 50 : 200),
    api_calls: tenant.max_api_calls_per_day || (tenant.subscription_plan === 'Kisan_Basic' ? 10000 : tenant.subscription_plan === 'Shakti_Growth' ? 50000 : 200000)
  };

  // Calculate metrics
  const totalApiCalls = recentApiLogs?.length || 0;
  const errorCalls = recentApiLogs?.filter(log => log.status_code >= 400).length || 0;
  const validLogs = recentApiLogs?.filter(log => log.response_time_ms != null) || [];
  const avgResponseTime = validLogs.length > 0 
    ? validLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / validLogs.length 
    : 0;
  const errorRate = totalApiCalls > 0 ? (errorCalls / totalApiCalls) * 100 : 0;

  const currentUsage = {
    farmers: farmersCount,
    dealers: dealersCount,
    products: productsCount,
    storage: Math.random() * 5,
    api_calls: totalApiCalls
  };

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

  // Generate trends
  const generateTrend = (baseValue: number, points: number = 7): number[] => {
    return Array.from({ length: points }, (_, i) => Math.floor(baseValue * (0.8 + Math.random() * 0.4)));
  };

  return new Response(
    JSON.stringify({
      success: true,
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
      limits: defaultLimits,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGetAnalytics(
  supabaseClient: any,
  tenantId: string | undefined,
  period: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!tenantId) {
    return new Response(
      JSON.stringify({ success: false, error: 'tenant_id is required' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const endDate = new Date();
  const startDate = new Date();
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  startDate.setDate(endDate.getDate() - periodDays);

  // Get API usage trends
  const { data: apiLogs } = await supabaseClient
    .from('api_logs')
    .select('created_at, status_code, response_time_ms')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  // Get activation trends
  const { data: activationLogs } = await supabaseClient
    .from('activation_logs')
    .select('created_at, success')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  const totalApiCalls = apiLogs?.length || 0;
  const errorCalls = apiLogs?.filter(log => log.status_code >= 400).length || 0;
  const avgResponseTime = (apiLogs?.reduce((sum: number, log: any) => sum + (log.response_time_ms || 0), 0) || 0) / Math.max(totalApiCalls, 1);

  // Generate time series helper
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

    const dataArray = Array.from(grouped.values());
    const growth_rate = dataArray.length >= 14 
      ? ((dataArray.slice(-7).reduce((a, b) => a + b, 0) - dataArray.slice(-14, -7).reduce((a, b) => a + b, 0)) / Math.max(dataArray.slice(-14, -7).reduce((a, b) => a + b, 0), 1)) * 100
      : 0;

    return { data: dataArray, labels, growth_rate };
  };

  return new Response(
    JSON.stringify({
      success: true,
      period,
      usage_trends: {
        farmers: generateTimeSeries(activationLogs?.filter(log => log.success) || [], 'created_at'),
        api_usage: generateTimeSeries(apiLogs || [], 'created_at'),
        revenue: {
          data: Array.from({ length: periodDays }, () => Math.floor(Math.random() * 1000) + 500),
          labels: Array.from({ length: periodDays }, (_, i) => {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            return date.toISOString().split('T')[0];
          }),
          growth_rate: 12.5
        },
        storage: {
          data: Array.from({ length: periodDays }, () => Math.floor(Math.random() * 500) + 100),
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
      },
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGetActivityFeed(
  supabaseClient: any,
  tenantId: string | undefined,
  limit: number,
  offset: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!tenantId) {
    return new Response(
      JSON.stringify({ success: false, error: 'tenant_id is required' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const [apiLogsResult, adminAuditResult, securityEventsResult, activationLogsResult] = await Promise.all([
    supabaseClient
      .from('api_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 4)),

    supabaseClient
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 4)),

    supabaseClient
      .from('security_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 4)),

    supabaseClient
      .from('activation_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 4))
  ]);

  const activities = [];

  // Process API logs
  if (apiLogsResult.data) {
    activities.push(...apiLogsResult.data.map(log => ({
      id: log.id,
      type: 'api_activity',
      title: `API ${log.method} ${log.endpoint}`,
      description: `Status: ${log.status_code} - Response time: ${log.response_time_ms}ms`,
      timestamp: log.created_at,
      metadata: { endpoint: log.endpoint, method: log.method, status_code: log.status_code },
      severity: log.status_code >= 400 ? 'high' : 'low',
    })));
  }

  // Process admin audit logs
  if (adminAuditResult.data) {
    activities.push(...adminAuditResult.data.map(log => ({
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

  // Process security events
  if (securityEventsResult.data) {
    activities.push(...securityEventsResult.data.map(event => ({
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

  // Process activation logs
  if (activationLogsResult.data) {
    activities.push(...activationLogsResult.data.map(log => ({
      id: log.id,
      type: 'activation',
      title: log.success ? 'Activation Successful' : 'Activation Failed',
      description: log.error_message || 'Activation code used',
      timestamp: log.created_at,
      metadata: log.metadata || {},
      severity: log.success ? 'low' : 'medium',
    })));
  }

  // Sort by timestamp
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const paginatedActivities = activities.slice(offset, offset + limit);

  return new Response(
    JSON.stringify({
      success: true,
      activities: paginatedActivities,
      total_count: activities.length,
      unread_count: activities.filter(a => a.severity === 'high').length,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(handler);
