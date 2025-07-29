import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SystemMetrics {
  cpu_usage_percent: number;
  memory_usage_percent: number;
  disk_usage_percent: number;
  network_io_mbps: number;
  active_connections: number;
  response_time_ms: number;
  error_rate_percent: number;
  throughput_rps: number;
}

const collectSystemMetrics = async (): Promise<SystemMetrics> => {
  // Simulate realistic system metrics collection
  // In production, these would come from actual system monitoring
  return {
    cpu_usage_percent: Math.round(20 + Math.random() * 60), // 20-80%
    memory_usage_percent: Math.round(30 + Math.random() * 50), // 30-80%
    disk_usage_percent: Math.round(40 + Math.random() * 40), // 40-80%
    network_io_mbps: Math.round(100 + Math.random() * 200), // 100-300 Mbps
    active_connections: Math.round(50 + Math.random() * 150), // 50-200
    response_time_ms: Math.round(10 + Math.random() * 90), // 10-100ms
    error_rate_percent: Math.round(Math.random() * 5), // 0-5%
    throughput_rps: Math.round(100 + Math.random() * 400), // 100-500 RPS
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Collect current system metrics
    const metrics = await collectSystemMetrics();
    
    // Calculate overall health score
    const healthScore = Math.round(
      100 - (
        (metrics.cpu_usage_percent * 0.2) +
        (metrics.memory_usage_percent * 0.2) +
        (metrics.disk_usage_percent * 0.15) +
        (metrics.error_rate_percent * 2) +
        (metrics.response_time_ms * 0.1)
      ) / 5
    );

    // Determine status based on metrics
    let status = 'healthy';
    if (healthScore < 60) status = 'critical';
    else if (healthScore < 80) status = 'warning';

    // Insert into system_health_metrics table
    const { error: insertError } = await supabaseClient
      .from('system_health_metrics')
      .insert({
        ...metrics,
        health_score: Math.max(0, Math.min(100, healthScore)),
        status,
        timestamp: new Date().toISOString(),
        metadata: {
          collection_method: 'automated',
          source: 'edge_function',
          version: '1.0'
        }
      });

    if (insertError) {
      console.error('Error inserting metrics:', insertError);
      throw insertError;
    }

    // Clean up old metrics (keep last 1000 records)
    const { error: cleanupError } = await supabaseClient
      .rpc('cleanup_old_metrics', { 
        table_name: 'system_health_metrics',
        keep_count: 1000 
      });

    if (cleanupError) {
      console.warn('Warning: Could not cleanup old metrics:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        health_score: healthScore,
        status,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );

  } catch (error) {
    console.error('Error collecting system metrics:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );
  }
};

serve(handler);
