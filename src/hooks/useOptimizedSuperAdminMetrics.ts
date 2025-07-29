
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

// Shared query key for cache consistency
const METRICS_QUERY_KEY = ['super-admin-metrics-optimized'];

export const useOptimizedSuperAdminMetrics = () => {
  const [previousMetrics, setPreviousMetrics] = useState<PlatformMetrics | null>(null);

  // Optimized metrics query with better caching strategy
  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: METRICS_QUERY_KEY,
    queryFn: async (): Promise<PlatformMetrics> => {
      console.log('Fetching optimized super admin metrics...');
      
      // Batch queries with specific column selection and limits
      const queries = [
        // Tenants - only status and creation date
        supabase
          .from('tenants')
          .select('id, status, created_at')
          .order('created_at', { ascending: false }),
        
        // Farmers - only login data for active calculation  
        supabase
          .from('farmers')
          .select('id, created_at, last_login_at')
          .order('created_at', { ascending: false }),
        
        // API usage - limited to recent data
        supabase
          .from('api_logs')
          .select('id, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(5000), // Reasonable limit
        
        // Subscriptions - only active ones
        supabase
          .from('tenant_subscriptions')
          .select('id, status')
          .eq('status', 'active'),
        
        // Financial metrics - recent month only
        supabase
          .from('financial_metrics')
          .select('amount, metric_name')
          .eq('metric_name', 'monthly_revenue')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(50)
      ];

      try {
        const [
          { data: tenants },
          { data: farmers },
          { data: apiLogs },
          { data: subscriptions },
          { data: financial }
        ] = await Promise.all(queries);

        // Efficient calculations
        const totalTenants = tenants?.length || 0;
        const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
        const totalFarmers = farmers?.length || 0;
        
        // Active farmers calculation (cached for 5 minutes via query)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activeFarmers = farmers?.filter(f => 
          f.last_login_at && new Date(f.last_login_at) > thirtyDaysAgo
        ).length || 0;
        
        const totalApiCalls = apiLogs?.length || 0;
        const monthlyRevenue = financial?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
        const activeSubscriptions = subscriptions?.length || 0;
        
        // Mock system metrics (in production, these would be cached)
        const systemHealth = Math.floor(95 + Math.random() * 5);
        const storageUsed = Math.floor(45 + Math.random() * 10);
        const pendingApprovals = Math.floor(Math.random() * 5);

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
      } catch (error) {
        console.error('Error in optimized metrics fetch:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - much longer than before
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: false, // No automatic refetching
    refetchOnWindowFocus: false, // Prevent unnecessary network calls
    retry: 2, // Limit retry attempts
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Calculate changes from previous metrics (memoized)
  const getMetricChange = (current: number, key: keyof PlatformMetrics): MetricChange | undefined => {
    if (!previousMetrics?.[key] || previousMetrics[key] === 0) return undefined;
    
    const change = ((current - previousMetrics[key]) / previousMetrics[key]) * 100;
    return {
      value: Math.abs(Math.round(change * 10) / 10),
      type: change >= 0 ? 'increase' : 'decrease',
      period: 'since last update'
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
    getMetricChange,
    // Expose cache status for debugging
    cacheStatus: metrics ? 'cached' : 'loading'
  };
};
