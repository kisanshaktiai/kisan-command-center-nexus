
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivityFeedResponse {
  activities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    metadata: Record<string, any>;
    severity: 'low' | 'medium' | 'high';
    user_id?: string;
    user_name?: string;
  }>;
  total_count: number;
  unread_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenant_id');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

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

    // Get recent activities from various sources
    const [
      apiLogsResult,
      adminAuditResult,
      securityEventsResult,
      activationLogsResult,
      tenantDetectionResult
    ] = await Promise.all([
      // API activity
      supabaseClient
        .from('api_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit / 5),

      // Admin audit logs
      supabaseClient
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit / 5),

      // Security events
      supabaseClient
        .from('security_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit / 5),

      // Activation logs
      supabaseClient
        .from('activation_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit / 5),

      // Tenant detection events
      supabaseClient
        .from('tenant_detection_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit / 5)
    ]);

    // Combine and format activities
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
        severity: log.status_code >= 400 ? 'high' : 'low' as const,
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
        severity: 'medium' as const,
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
        severity: 'high' as const,
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
        severity: log.success ? 'low' : 'medium' as const,
      })));
    }

    // Process tenant detection events
    if (tenantDetectionResult.data) {
      activities.push(...tenantDetectionResult.data.map(event => ({
        id: event.id,
        type: 'tenant_detection',
        title: `Tenant Detection: ${event.event_type}`,
        description: `Domain: ${event.domain}`,
        timestamp: event.created_at,
        metadata: event.metadata || {},
        severity: 'low' as const,
      })));
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const paginatedActivities = activities.slice(offset, offset + limit);

    const response: ActivityFeedResponse = {
      activities: paginatedActivities,
      total_count: activities.length,
      unread_count: activities.filter(a => a.severity === 'high').length,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in tenant-activity-feed:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
