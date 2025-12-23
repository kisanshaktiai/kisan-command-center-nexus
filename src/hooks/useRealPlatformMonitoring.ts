import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface PlatformMetrics {
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    healthScore: number;
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    cpuHistory: number[];
    memoryHistory: number[];
  };
  apiMetrics: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>;
  };
  resourceUsage: {
    apiCalls: { current: number; limit: number; percentage: number };
    storage: { current: number; limit: number; percentage: number };
    bandwidth: { current: number; limit: number; percentage: number };
    connections: { current: number; limit: number; percentage: number };
  };
  financialMetrics: {
    monthlyRevenue: number;
    mrrGrowth: number;
    totalSubscriptions: number;
    arpu: number;
    revenueHistory: number[];
  };
  platformStats: {
    activeTenants: number;
    activeFarmers: number;
    activeDealers: number;
    activeUsers: number;
    activeSessions: number;
  };
}

export const useRealPlatformMonitoring = (tenantId?: string) => {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Fetch real platform metrics
  const { data: metrics, isLoading, error, refetch } = useQuery<PlatformMetrics>({
    queryKey: ['real-platform-monitoring', tenantId],
    queryFn: async () => {
      console.log('[RealPlatformMonitoring] Fetching metrics...');

      try {
        // Fetch all data in parallel
        const [
          healthResult,
          resourceResult,
          apiLogsResult,
          financialResult,
          tenantsResult,
          farmersResult,
          dealersResult,
          sessionsResult
        ] = await Promise.all([
          supabase
            .from('system_health_metrics')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(50),
          supabase
            .from('resource_utilization')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('api_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000),
          supabase
            .from('financial_analytics')
            .select('*')
            .eq('metric_type', 'revenue')
            .order('period_start', { ascending: false })
            .limit(12),
          supabase
            .from('tenants')
            .select('id, status')
            .eq('status', 'active'),
          supabase
            .from('farmers')
            .select('id'),
          supabase
            .from('dealers')
            .select('id'),
          supabase
            .from('active_sessions')
            .select('id')
            .eq('is_active', true)
        ]);

        // Check for errors
        if (healthResult.error) throw healthResult.error;
        if (resourceResult.error) throw resourceResult.error;
        if (apiLogsResult.error) throw apiLogsResult.error;
        if (financialResult.error) throw financialResult.error;
        if (tenantsResult.error) throw tenantsResult.error;
        if (farmersResult.error) throw farmersResult.error;
        if (dealersResult.error) throw dealersResult.error;
        if (sessionsResult.error) throw sessionsResult.error;

        const healthData = healthResult.data || [];
        const resourceData = resourceResult.data || [];
        const apiLogs = apiLogsResult.data || [];
        const financialData = financialResult.data || [];

        console.log('[RealPlatformMonitoring] Data fetched:', {
          health: healthData.length,
          resource: resourceData.length,
          apiLogs: apiLogs.length,
          financial: financialData.length,
          tenants: tenantsResult.data?.length,
          farmers: farmersResult.data?.length,
          dealers: dealersResult.data?.length,
          sessions: sessionsResult.data?.length
        });

        // Process system health
        const cpuMetrics = healthData.filter(m => m.metric_name === 'cpu_usage');
        const memoryMetrics = healthData.filter(m => m.metric_name === 'memory_usage');
        const diskMetrics = healthData.filter(m => m.metric_name === 'disk_usage');

        const currentCpu = cpuMetrics[0]?.value || 0;
        const currentMemory = memoryMetrics[0]?.value || 0;
        const currentDisk = diskMetrics[0]?.value || 0;

        const healthScore = Math.round((100 - (currentCpu + currentMemory + currentDisk) / 3));
        const status = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';

        // Process API metrics
        const totalRequests = apiLogs.length;
        const successfulRequests = apiLogs.filter(log => log.status_code < 400).length;
        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
        const avgResponseTime = apiLogs.reduce((acc, log) => acc + (log.response_time_ms || 0), 0) / (totalRequests || 1);

        // Get top endpoints
        const endpointMap = new Map<string, { count: number; totalTime: number }>();
        apiLogs.forEach(log => {
          const key = `${log.method} ${log.endpoint}`;
          const existing = endpointMap.get(key) || { count: 0, totalTime: 0 };
          endpointMap.set(key, {
            count: existing.count + 1,
            totalTime: existing.totalTime + (log.response_time_ms || 0)
          });
        });

        const topEndpoints = Array.from(endpointMap.entries())
          .map(([endpoint, stats]) => ({
            endpoint,
            count: stats.count,
            avgTime: stats.totalTime / stats.count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Process resource usage
        const apiCallsResource = resourceData.find(r => r.resource_type === 'api_calls');
        const storageResource = resourceData.find(r => r.resource_type === 'storage');
        const bandwidthResource = resourceData.find(r => r.resource_type === 'bandwidth');
        const connectionsResource = resourceData.find(r => r.resource_type === 'database_connections');

        // Process financial metrics
        const currentRevenue = financialData[0]?.amount || 0;
        const previousRevenue = financialData[1]?.amount || 0;
        const mrrGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        const revenueHistory = financialData.map(f => f.amount || 0).reverse();

        // Count active users (unique farmers + dealers from recent API logs)
        const recentLogs = apiLogs.slice(0, 100);
        const uniqueUsers = new Set(recentLogs.map(log => log.api_key_id).filter(Boolean));

        return {
          systemHealth: {
            cpuUsage: currentCpu,
            memoryUsage: currentMemory,
            diskUsage: currentDisk,
            healthScore,
            status,
            uptime: 99.9,
            cpuHistory: cpuMetrics.slice(0, 20).map(m => m.value).reverse(),
            memoryHistory: memoryMetrics.slice(0, 20).map(m => m.value).reverse()
          },
          apiMetrics: {
            totalRequests,
            successRate: Math.round(successRate * 100) / 100,
            avgResponseTime: Math.round(avgResponseTime * 100) / 100,
            requestsPerMinute: Math.round(totalRequests / 60),
            errorRate: Math.round((100 - successRate) * 100) / 100,
            topEndpoints
          },
          resourceUsage: {
            apiCalls: {
              current: apiCallsResource?.current_usage || 0,
              limit: apiCallsResource?.max_limit || 20000,
              percentage: apiCallsResource?.usage_percentage || 0
            },
            storage: {
              current: storageResource?.current_usage || 0,
              limit: storageResource?.max_limit || 500,
              percentage: storageResource?.usage_percentage || 0
            },
            bandwidth: {
              current: bandwidthResource?.current_usage || 0,
              limit: bandwidthResource?.max_limit || 1000,
              percentage: bandwidthResource?.usage_percentage || 0
            },
            connections: {
              current: connectionsResource?.current_usage || 0,
              limit: connectionsResource?.max_limit || 100,
              percentage: connectionsResource?.usage_percentage || 0
            }
          },
          financialMetrics: {
            monthlyRevenue: currentRevenue,
            mrrGrowth: Math.round(mrrGrowth * 100) / 100,
            totalSubscriptions: tenantsResult.data?.length || 0,
            arpu: currentRevenue / (tenantsResult.data?.length || 1),
            revenueHistory
          },
          platformStats: {
            activeTenants: tenantsResult.data?.length || 0,
            activeFarmers: farmersResult.data?.length || 0,
            activeDealers: dealersResult.data?.length || 0,
            activeUsers: uniqueUsers.size,
            activeSessions: sessionsResult.data?.length || 0
          }
        };
      } catch (error) {
        console.error('[RealPlatformMonitoring] Error fetching metrics:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000,
    retry: 3,
    retryDelay: 1000
  });

  // Setup realtime subscriptions
  useEffect(() => {
    console.log('[RealPlatformMonitoring] Setting up realtime subscriptions...');

    const channel = supabase
      .channel('platform-monitoring-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'system_health_metrics'
      }, (payload) => {
        console.log('[Realtime] New health metric:', payload.new);
        refetch();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'api_logs'
      }, (payload) => {
        console.log('[Realtime] New API log:', payload.new);
        refetch();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'resource_utilization'
      }, (payload) => {
        console.log('[Realtime] New resource metric:', payload.new);
        refetch();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'financial_analytics'
      }, (payload) => {
        console.log('[Realtime] New financial metric:', payload.new);
        refetch();
      })
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          toast.success('Live monitoring connected', { duration: 2000 });
        } else if (status === 'CHANNEL_ERROR') {
          toast.error('Realtime connection error', { duration: 3000 });
        }
      });

    return () => {
      console.log('[RealPlatformMonitoring] Cleaning up realtime subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    metrics,
    isLoading,
    error,
    refetch,
    isRealtimeConnected
  };
};
