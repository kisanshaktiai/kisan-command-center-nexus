import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Generate realistic monitoring data
    const now = new Date()
    
    // Get a random existing tenant or null for global metrics
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .limit(10)
    
    if (tenantError) {
      console.error('Error fetching tenants:', tenantError)
    }
    
    // Use a random existing tenant ID or null for global metrics
    const tenantId = tenants && tenants.length > 0 
      ? tenants[Math.floor(Math.random() * tenants.length)].id 
      : null
    
    console.log('Using tenant ID:', tenantId)
    
    // Generate multiple system health metrics (can be null tenant_id for global metrics)
    const systemHealthMetrics = [
      {
        tenant_id: tenantId,
        metric_type: 'system',
        metric_name: 'cpu_usage',
        value: 45 + Math.random() * 30, // 45-75%
        unit: 'percent',
        labels: { component: 'api-server' },
        timestamp: now.toISOString(),
        created_at: now.toISOString(),
      },
      {
        tenant_id: tenantId,
        metric_type: 'system',
        metric_name: 'memory_usage',
        value: 60 + Math.random() * 20, // 60-80%
        unit: 'percent',
        labels: { component: 'api-server' },
        timestamp: now.toISOString(),
        created_at: now.toISOString(),
      },
      {
        tenant_id: tenantId,
        metric_type: 'system',
        metric_name: 'disk_usage',
        value: 40 + Math.random() * 30, // 40-70%
        unit: 'percent',
        labels: { component: 'storage' },
        timestamp: now.toISOString(),
        created_at: now.toISOString(),
      },
      {
        tenant_id: tenantId,
        metric_type: 'network',
        metric_name: 'latency',
        value: 10 + Math.random() * 50, // 10-60ms
        unit: 'milliseconds',
        labels: { region: 'us-east-1' },
        timestamp: now.toISOString(),
        created_at: now.toISOString(),
      },
      {
        tenant_id: tenantId,
        metric_type: 'application',
        metric_name: 'active_users',
        value: Math.floor(50 + Math.random() * 100),
        unit: 'count',
        labels: { tier: 'premium' },
        timestamp: now.toISOString(),
        created_at: now.toISOString(),
      }
    ]

    // Generate resource utilization data (usage_percentage is generated automatically)
    const resourceUtilization = [
      {
        tenant_id: tenantId,
        resource_type: 'api_calls',
        current_usage: Math.floor(10000 + Math.random() * 5000),
        max_limit: 20000,
        period_start: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
        period_end: now.toISOString(),
        metadata: { rate_limit_tier: 'standard' },
        created_at: now.toISOString(),
      },
      {
        tenant_id: tenantId,
        resource_type: 'storage',
        current_usage: 25 + Math.random() * 25,
        max_limit: 100,
        period_start: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
        period_end: now.toISOString(),
        metadata: { unit: 'GB' },
        created_at: now.toISOString(),
      },
      {
        tenant_id: tenantId,
        resource_type: 'bandwidth',
        current_usage: 50 + Math.random() * 50,
        max_limit: 200,
        period_start: new Date(now.getTime() - 86400000).toISOString(),
        period_end: now.toISOString(),
        metadata: { unit: 'GB' },
        created_at: now.toISOString(),
      },
      {
        tenant_id: tenantId,
        resource_type: 'database_connections',
        current_usage: Math.floor(10 + Math.random() * 20),
        max_limit: 50,
        period_start: now.toISOString(),
        period_end: now.toISOString(),
        metadata: { pool_size: 20 },
        created_at: now.toISOString(),
      }
    ]

    // Generate API logs
    const endpoints = ['/api/auth/login', '/api/users', '/api/farmers', '/api/products', '/api/analytics']
    const methods = ['GET', 'POST', 'PUT', 'DELETE']
    const apiLogs = []
    
    for (let i = 0; i < 10; i++) {
      apiLogs.push({
        tenant_id: tenantId,
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        method: methods[Math.floor(Math.random() * methods.length)],
        status_code: Math.random() > 0.9 ? 500 : 200,
        response_time_ms: Math.floor(50 + Math.random() * 450),
        created_at: new Date(now.getTime() - Math.random() * 3600000).toISOString(), // Random time in last hour
      })
    }

    // Generate financial analytics (only if we have a tenant)
    const financialAnalytics = tenantId ? {
      tenant_id: tenantId,
      metric_type: 'revenue',
      amount: 50000 + Math.random() * 20000,
      currency: 'USD',
      period_type: 'monthly',
      period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
      breakdown: {
        subscriptions: 40000 + Math.random() * 10000,
        one_time: 10000 + Math.random() * 10000,
        mrr: 5000 + Math.random() * 2000,
        new_customers: Math.floor(5 + Math.random() * 10),
        churned_customers: Math.floor(Math.random() * 3),
      },
      created_at: now.toISOString(),
    } : null

    // Insert all data in parallel (skip financial if no tenant)
    const insertPromises = [
      supabase.from('system_health_metrics').insert(systemHealthMetrics),
      supabase.from('resource_utilization').insert(resourceUtilization),
      supabase.from('api_logs').insert(apiLogs),
    ]
    
    if (financialAnalytics) {
      insertPromises.push(supabase.from('financial_analytics').insert(financialAnalytics))
    }
    
    const results = await Promise.all(insertPromises)
    const [healthResult, resourceResult, apiResult, financialResult] = results

    // Check for errors
    const errors = []
    if (healthResult.error) errors.push({ table: 'system_health_metrics', error: healthResult.error })
    if (resourceResult.error) errors.push({ table: 'resource_utilization', error: resourceResult.error })
    if (apiResult.error) errors.push({ table: 'api_logs', error: apiResult.error })
    if (financialResult && financialResult.error) errors.push({ table: 'financial_analytics', error: financialResult.error })

    if (errors.length > 0) {
      console.error('Errors inserting data:', errors)
      return new Response(
        JSON.stringify({ success: false, errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Monitoring data generated successfully',
        data: {
          health_metrics: systemHealthMetrics.length,
          resource_records: resourceUtilization.length,
          api_logs: apiLogs.length,
          financial_records: financialAnalytics ? 1 : 0,
          tenant_id: tenantId
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in generate-monitoring-data function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})