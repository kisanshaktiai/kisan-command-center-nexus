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
    
    // Generate system health metrics
    const systemHealthData = {
      tenant_id: '00000000-0000-0000-0000-000000000000',
      cpu_usage: 45 + Math.random() * 30, // 45-75%
      memory_usage: 60 + Math.random() * 20, // 60-80%
      disk_usage: 40 + Math.random() * 30, // 40-70%
      network_latency: 10 + Math.random() * 50, // 10-60ms
      uptime_hours: 720 + Math.floor(Math.random() * 100),
      active_connections: Math.floor(50 + Math.random() * 100),
      error_rate: Math.random() * 5, // 0-5%
      health_score: 85 + Math.random() * 15, // 85-100
      status: Math.random() > 0.1 ? 'healthy' : 'warning',
      created_at: now.toISOString(),
    }

    // Generate resource utilization
    const resourceData = {
      tenant_id: '00000000-0000-0000-0000-000000000000',
      api_calls: Math.floor(10000 + Math.random() * 5000),
      api_limit: 20000,
      storage_used_gb: 25 + Math.random() * 25,
      storage_limit_gb: 100,
      bandwidth_used_gb: 50 + Math.random() * 50,
      bandwidth_limit_gb: 200,
      database_connections: Math.floor(10 + Math.random() * 20),
      database_limit: 50,
      created_at: now.toISOString(),
    }

    // Generate API logs
    const endpoints = ['/api/auth/login', '/api/users', '/api/farmers', '/api/products', '/api/analytics']
    const methods = ['GET', 'POST', 'PUT', 'DELETE']
    const apiLogData = {
      tenant_id: '00000000-0000-0000-0000-000000000000',
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      method: methods[Math.floor(Math.random() * methods.length)],
      status_code: Math.random() > 0.9 ? 500 : 200,
      response_time_ms: Math.floor(50 + Math.random() * 450),
      created_at: now.toISOString(),
    }

    // Generate financial analytics
    const financialData = {
      tenant_id: '00000000-0000-0000-0000-000000000000',
      total_revenue: 50000 + Math.random() * 20000,
      mrr: 5000 + Math.random() * 2000,
      arr: 60000 + Math.random() * 24000,
      churn_rate: Math.random() * 10,
      arpu: 100 + Math.random() * 50,
      total_customers: Math.floor(40 + Math.random() * 20),
      new_customers: Math.floor(Math.random() * 10),
      churned_customers: Math.floor(Math.random() * 3),
      created_at: now.toISOString(),
    }

    // Insert all data in parallel
    const [healthResult, resourceResult, apiResult, financialResult] = await Promise.all([
      supabase.from('system_health_metrics').insert(systemHealthData),
      supabase.from('resource_utilization').insert(resourceData),
      supabase.from('api_logs').insert(apiLogData),
      supabase.from('financial_analytics').insert(financialData),
    ])

    // Check for errors
    const errors = []
    if (healthResult.error) errors.push({ table: 'system_health_metrics', error: healthResult.error })
    if (resourceResult.error) errors.push({ table: 'resource_utilization', error: resourceResult.error })
    if (apiResult.error) errors.push({ table: 'api_logs', error: apiResult.error })
    if (financialResult.error) errors.push({ table: 'financial_analytics', error: financialResult.error })

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
          systemHealth: systemHealthData,
          resources: resourceData,
          apiLog: apiLogData,
          financial: financialData
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating monitoring data:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})