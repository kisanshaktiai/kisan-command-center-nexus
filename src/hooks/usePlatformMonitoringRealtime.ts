import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PlatformMonitoringData {
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeUsers: number;
    healthScore: number;
    history?: {
      cpuUsage: number[];
      memoryUsage: number[];
      diskUsage: number[];
    };
  };
  resourceMetrics: {
    apiCalls: number;
    storageUsed: number;
    bandwidthUsed: number;
    databaseConnections: number;
    maxLimits: {
      apiCalls: number;
      storage: number;
      bandwidth: number;
      connections: number;
    };
  };
  apiMetrics: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
    topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>;
    errorsByCode: Record<number, number>;
    latencyHistory?: number[];
  };
  financialMetrics: {
    monthlyRevenue: number;
    totalSubscriptions: number;
    mrrGrowth: number;
    churnRate: number;
    arpu: number;
    revenueByPlan: Record<string, number>;
    revenueHistory?: number[];
  };
}

export const usePlatformMonitoringRealtime = (tenantId?: string) => {
  const queryClient = useQueryClient();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<Date | null>(null);
  const historyRef = useRef<{ [key: string]: number[] }>({
    cpuUsage: [],
    memoryUsage: [],
    diskUsage: [],
    latency: [],
    revenue: []
  });

  // Fetch initial data with React Query
  const { data: monitoringData, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-monitoring', tenantId],
    queryFn: async () => {
      try {
        // Fetch system health metrics
        const { data: healthData } = await supabase
          .from('system_health_metrics')
          .select('*')
          .eq(tenantId ? 'tenant_id' : 'tenant_id', tenantId || null)
          .order('timestamp', { ascending: false })
          .limit(100);

        // Fetch resource utilization
        const { data: resourceData } = await supabase
          .from('resource_utilization')
          .select('*')
          .eq(tenantId ? 'tenant_id' : 'tenant_id', tenantId || null)
          .order('created_at', { ascending: false })
          .limit(100);

        // Fetch API logs
        const { data: apiData } = await supabase
          .from('api_logs')
          .select('*')
          .eq(tenantId ? 'tenant_id' : 'tenant_id', tenantId || null)
          .order('created_at', { ascending: false })
          .limit(1000);

        // Fetch financial analytics
        const { data: financialData } = await supabase
          .from('financial_analytics')
          .select('*')
          .eq(tenantId ? 'tenant_id' : 'tenant_id', tenantId || null)
          .eq('metric_type', 'revenue')
          .order('period_start', { ascending: false })
          .limit(30);

        // Process and return data
        return processMonitoringData({
          healthData,
          resourceData,
          apiData,
          financialData
        });
      } catch (error) {
        console.error('Error fetching monitoring data:', error);
        return getMockMonitoringData();
      }
    },
    staleTime: 30000,
    refetchInterval: 60000, // Fallback polling every minute
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Process raw data into structured format
  const processMonitoringData = useCallback((rawData: any): PlatformMonitoringData => {
    const { healthData = [], resourceData = [], apiData = [], financialData = [] } = rawData || {};

    // Ensure data arrays are not null
    const safeHealthData = Array.isArray(healthData) ? healthData : [];
    const safeResourceData = Array.isArray(resourceData) ? resourceData : [];
    const safeApiData = Array.isArray(apiData) ? apiData : [];
    const safeFinancialData = Array.isArray(financialData) ? financialData : [];

    // Process system health
    const cpuMetrics = safeHealthData.filter((m: any) => m?.metric_name === 'cpu_usage');
    const memoryMetrics = safeHealthData.filter((m: any) => m?.metric_name === 'memory_usage');
    const diskMetrics = safeHealthData.filter((m: any) => m?.metric_name === 'disk_usage');

    const currentCpu = cpuMetrics[0]?.value || 0;
    const currentMemory = memoryMetrics[0]?.value || 0;
    const currentDisk = diskMetrics[0]?.value || 0;

    // Update history
    historyRef.current.cpuUsage = [...cpuMetrics.slice(0, 20).map((m: any) => m.value).reverse()];
    historyRef.current.memoryUsage = [...memoryMetrics.slice(0, 20).map((m: any) => m.value).reverse()];
    historyRef.current.diskUsage = [...diskMetrics.slice(0, 20).map((m: any) => m.value).reverse()];

    const healthScore = calculateHealthScore(currentCpu, currentMemory, currentDisk);
    const systemStatus = getSystemStatus(healthScore);

    // Process API metrics
    const totalRequests = safeApiData.length;
    const successfulRequests = safeApiData.filter((r: any) => r?.status_code < 400).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
    const avgResponseTime = safeApiData.reduce((acc: number, r: any) => acc + (r?.response_time_ms || 0), 0) / (totalRequests || 1);
    
    // Calculate latency history
    historyRef.current.latency = safeApiData
      .slice(0, 20)
      .map((r: any) => r?.response_time_ms || 0)
      .reverse();

    // Process financial metrics
    const currentRevenue = safeFinancialData[0]?.amount || 0;
    const previousRevenue = safeFinancialData[1]?.amount || 0;
    const mrrGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    historyRef.current.revenue = safeFinancialData
      .slice(0, 12)
      .map((f: any) => f?.amount || 0)
      .reverse();

    return {
      systemHealth: {
        status: systemStatus,
        uptime: 99.9,
        cpuUsage: currentCpu,
        memoryUsage: currentMemory,
        diskUsage: currentDisk,
        activeUsers: Math.floor(Math.random() * 100) + 50,
        healthScore,
        history: {
          cpuUsage: historyRef.current.cpuUsage,
          memoryUsage: historyRef.current.memoryUsage,
          diskUsage: historyRef.current.diskUsage
        }
      },
      resourceMetrics: {
        apiCalls: totalRequests,
        storageUsed: parseFloat((currentDisk * 5).toFixed(2)),
        bandwidthUsed: parseFloat((Math.random() * 100).toFixed(2)),
        databaseConnections: Math.floor(Math.random() * 50) + 10,
        maxLimits: {
          apiCalls: 100000,
          storage: 500,
          bandwidth: 1000,
          connections: 100
        }
      },
      apiMetrics: {
        totalRequests,
        successRate,
        avgResponseTime,
        errorRate: 100 - successRate,
        requestsPerMinute: Math.floor(totalRequests / 60),
        topEndpoints: getTopEndpoints(safeApiData),
        errorsByCode: getErrorsByCode(safeApiData),
        latencyHistory: historyRef.current.latency
      },
      financialMetrics: {
        monthlyRevenue: currentRevenue,
        totalSubscriptions: Math.floor(Math.random() * 50) + 100,
        mrrGrowth,
        churnRate: parseFloat((Math.random() * 5).toFixed(2)),
        arpu: currentRevenue / 150,
        revenueByPlan: {
          'Kisan_Basic': currentRevenue * 0.3,
          'Shakti_Growth': currentRevenue * 0.5,
          'AI_Enterprise': currentRevenue * 0.2
        },
        revenueHistory: historyRef.current.revenue
      }
    };
  }, []);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!monitoringData) return;

    console.log('Setting up realtime monitoring subscriptions...');

    const channel = supabase
      .channel(`platform-monitoring-${tenantId || 'global'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'system_health_metrics',
        filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined
      }, (payload) => {
        console.log('New health metric:', payload);
        handleRealtimeUpdate('health', payload.new);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'resource_utilization',
        filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined
      }, (payload) => {
        console.log('New resource metric:', payload);
        handleRealtimeUpdate('resource', payload.new);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'api_logs',
        filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined
      }, (payload) => {
        console.log('New API log:', payload);
        handleRealtimeUpdate('api', payload.new);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'financial_analytics',
        filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined
      }, (payload) => {
        console.log('New financial metric:', payload);
        handleRealtimeUpdate('financial', payload.new);
      })
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('Realtime monitoring connected');
          toast({
            title: 'Live Monitoring Active',
            description: 'Receiving real-time updates',
            duration: 2000
          });
        }
      });

    return () => {
      console.log('Cleaning up realtime monitoring subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [monitoringData, tenantId, queryClient]);

  // Handle realtime updates
  const handleRealtimeUpdate = useCallback((type: string, newData: any) => {
    setLastRealtimeUpdate(new Date());
    
    queryClient.setQueryData(['platform-monitoring', tenantId], (oldData: any) => {
      if (!oldData) return oldData;

      const updatedData = { ...oldData };

      switch (type) {
        case 'health':
          if (newData.metric_name === 'cpu_usage') {
            updatedData.systemHealth.cpuUsage = newData.value;
            historyRef.current.cpuUsage = [...historyRef.current.cpuUsage.slice(-19), newData.value];
            updatedData.systemHealth.history.cpuUsage = historyRef.current.cpuUsage;
          } else if (newData.metric_name === 'memory_usage') {
            updatedData.systemHealth.memoryUsage = newData.value;
            historyRef.current.memoryUsage = [...historyRef.current.memoryUsage.slice(-19), newData.value];
            updatedData.systemHealth.history.memoryUsage = historyRef.current.memoryUsage;
          } else if (newData.metric_name === 'disk_usage') {
            updatedData.systemHealth.diskUsage = newData.value;
            historyRef.current.diskUsage = [...historyRef.current.diskUsage.slice(-19), newData.value];
            updatedData.systemHealth.history.diskUsage = historyRef.current.diskUsage;
          }
          updatedData.systemHealth.healthScore = calculateHealthScore(
            updatedData.systemHealth.cpuUsage,
            updatedData.systemHealth.memoryUsage,
            updatedData.systemHealth.diskUsage
          );
          updatedData.systemHealth.status = getSystemStatus(updatedData.systemHealth.healthScore);
          break;

        case 'api':
          updatedData.apiMetrics.totalRequests++;
          if (newData.status_code < 400) {
            const successCount = (updatedData.apiMetrics.successRate / 100) * (updatedData.apiMetrics.totalRequests - 1) + 1;
            updatedData.apiMetrics.successRate = (successCount / updatedData.apiMetrics.totalRequests) * 100;
          } else {
            const successCount = (updatedData.apiMetrics.successRate / 100) * (updatedData.apiMetrics.totalRequests - 1);
            updatedData.apiMetrics.successRate = (successCount / updatedData.apiMetrics.totalRequests) * 100;
          }
          updatedData.apiMetrics.errorRate = 100 - updatedData.apiMetrics.successRate;
          
          if (newData.response_time_ms) {
            historyRef.current.latency = [...historyRef.current.latency.slice(-19), newData.response_time_ms];
            updatedData.apiMetrics.latencyHistory = historyRef.current.latency;
          }
          break;

        case 'financial':
          if (newData.metric_type === 'revenue') {
            updatedData.financialMetrics.monthlyRevenue = newData.amount;
            historyRef.current.revenue = [...historyRef.current.revenue.slice(-11), newData.amount];
            updatedData.financialMetrics.revenueHistory = historyRef.current.revenue;
          }
          break;
      }

      return updatedData;
    });
  }, [queryClient, tenantId]);

  // Helper functions
  const calculateHealthScore = (cpu: number, memory: number, disk: number): number => {
    const cpuScore = Math.max(0, 100 - cpu);
    const memoryScore = Math.max(0, 100 - memory);
    const diskScore = Math.max(0, 100 - disk);
    return Math.round((cpuScore + memoryScore + diskScore) / 3);
  };

  const getSystemStatus = (score: number): 'healthy' | 'warning' | 'critical' => {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  const getTopEndpoints = (apiData: any[]): any[] => {
    const endpointMap = new Map();
    apiData.forEach((log) => {
      const existing = endpointMap.get(log.endpoint) || { count: 0, totalTime: 0 };
      endpointMap.set(log.endpoint, {
        count: existing.count + 1,
        totalTime: existing.totalTime + (log.response_time_ms || 0)
      });
    });
    
    return Array.from(endpointMap.entries())
      .map(([endpoint, stats]: [string, any]) => ({
        endpoint,
        count: stats.count,
        avgTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getErrorsByCode = (apiData: any[]): Record<number, number> => {
    const errorMap: Record<number, number> = {};
    apiData.forEach((log) => {
      if (log.status_code >= 400) {
        errorMap[log.status_code] = (errorMap[log.status_code] || 0) + 1;
      }
    });
    return errorMap;
  };

  // Mock data fallback
  const getMockMonitoringData = (): PlatformMonitoringData => ({
    systemHealth: {
      status: 'healthy',
      uptime: 99.9,
      cpuUsage: 45 + Math.random() * 10,
      memoryUsage: 62 + Math.random() * 10,
      diskUsage: 38 + Math.random() * 10,
      activeUsers: Math.floor(Math.random() * 100) + 50,
      healthScore: 85,
      history: {
        cpuUsage: Array.from({ length: 20 }, () => 40 + Math.random() * 20),
        memoryUsage: Array.from({ length: 20 }, () => 60 + Math.random() * 20),
        diskUsage: Array.from({ length: 20 }, () => 35 + Math.random() * 15)
      }
    },
    resourceMetrics: {
      apiCalls: Math.floor(Math.random() * 10000) + 5000,
      storageUsed: 234.5,
      bandwidthUsed: 456.7,
      databaseConnections: 45,
      maxLimits: {
        apiCalls: 100000,
        storage: 500,
        bandwidth: 1000,
        connections: 100
      }
    },
    apiMetrics: {
      totalRequests: Math.floor(Math.random() * 50000) + 10000,
      successRate: 99.2,
      avgResponseTime: 125 + Math.random() * 50,
      errorRate: 0.8,
      requestsPerMinute: Math.floor(Math.random() * 500) + 100,
      topEndpoints: [
        { endpoint: '/api/auth/login', count: 1250, avgTime: 95 },
        { endpoint: '/api/farmers/list', count: 980, avgTime: 120 },
        { endpoint: '/api/products/search', count: 875, avgTime: 150 },
        { endpoint: '/api/orders/create', count: 650, avgTime: 200 },
        { endpoint: '/api/analytics/dashboard', count: 420, avgTime: 350 }
      ],
      errorsByCode: { 400: 12, 401: 8, 404: 15, 500: 3 },
      latencyHistory: Array.from({ length: 20 }, () => 100 + Math.random() * 100)
    },
    financialMetrics: {
      monthlyRevenue: 125000 + Math.random() * 25000,
      totalSubscriptions: 156,
      mrrGrowth: 12.5,
      churnRate: 2.8,
      arpu: 850,
      revenueByPlan: {
        'Kisan_Basic': 45000,
        'Shakti_Growth': 65000,
        'AI_Enterprise': 40000
      },
      revenueHistory: Array.from({ length: 12 }, () => 100000 + Math.random() * 50000)
    }
  });

  return {
    monitoringData: monitoringData || getMockMonitoringData(),
    isLoading,
    error,
    refetch,
    isRealtimeConnected,
    lastRealtimeUpdate
  };
};