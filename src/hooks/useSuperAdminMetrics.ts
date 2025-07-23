
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  totalFarmers: number;
  activeFarmers: number;
  totalApiCalls: number;
  monthlyRevenue: number;
  systemHealth: number;
  storageUsed: number;
  activeSubscriptions: number;
  pendingApprovals: number;
}

interface MetricChange {
  value: number;
  type: 'increase' | 'decrease';
  period: string;
}

export const useSuperAdminMetrics = () => {
  const [previousMetrics, setPreviousMetrics] = useState<PlatformMetrics | null>(null);

  // Real-time platform metrics
  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['super-admin-metrics'],
    queryFn: async (): Promise<PlatformMetrics> => {
      console.log('Fetching super admin metrics...');
      
      // Fetch tenants data
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, status, created_at');
      
      // Fetch farmers data  
      const { data: farmers } = await supabase
        .from('farmers')
        .select('id, created_at, last_login_at');
      
      // Fetch API usage from logs
      const { data: apiLogs } = await supabase
        .from('api_logs')
        .select('id, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from('tenant_subscriptions')
        .select('id, status, current_period_start, current_period_end')
        .eq('status', 'active');
      
      // Fetch financial metrics for revenue
      const { data: financial } = await supabase
        .from('financial_metrics')
        .select('amount, metric_name, timestamp')
        .eq('metric_name', 'monthly_revenue')
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Calculate metrics
      const totalTenants = tenants?.length || 0;
      const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
      const totalFarmers = farmers?.length || 0;
      
      // Active farmers (logged in within last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeFarmers = farmers?.filter(f => 
        f.last_login_at && new Date(f.last_login_at) > thirtyDaysAgo
      ).length || 0;
      
      const totalApiCalls = apiLogs?.length || 0;
      const monthlyRevenue = financial?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
      const activeSubscriptions = subscriptions?.length || 0;
      
      // Mock some metrics that would come from system monitoring
      const systemHealth = Math.floor(95 + Math.random() * 5); // 95-100%
      const storageUsed = Math.floor(45 + Math.random() * 10); // 45-55%
      const pendingApprovals = Math.floor(Math.random() * 5); // 0-5 pending

      return {
        totalTenants,
        activeTenants,
        totalFarmers,
        activeFarmers,
        totalApiCalls,
        monthlyRevenue,
        systemHealth,
        storageUsed,
        activeSubscriptions,
        pendingApprovals
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000,
  });

  // Calculate changes from previous metrics
  const getMetricChange = (current: number, previous: number | undefined): MetricChange | undefined => {
    if (!previous || previous === 0) return undefined;
    
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change * 10) / 10),
      type: change >= 0 ? 'increase' : 'decrease',
      period: 'last period'
    };
  };

  // Store previous metrics for comparison
  useEffect(() => {
    if (metrics && !previousMetrics) {
      setPreviousMetrics(metrics);
    }
  }, [metrics, previousMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch,
    getMetricChange: (current: number, key: keyof PlatformMetrics) => 
      getMetricChange(current, previousMetrics?.[key])
  };
};
