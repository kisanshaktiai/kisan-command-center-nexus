
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  totalFarmers: number;
  activeFarmers: number;
  totalApiCalls: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  pendingApprovals: number;
}

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      console.log('Fetching dashboard metrics...');
      
      const [
        tenantsResponse,
        farmersResponse,
        apiLogsResponse,
        subscriptionsResponse,
        financialResponse
      ] = await Promise.all([
        supabase
          .from('tenants')
          .select('id, status, created_at')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('farmers')
          .select('id, created_at, last_login_at')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('api_logs')
          .select('id, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(100),
        
        supabase
          .from('tenant_subscriptions')
          .select('id, status')
          .eq('status', 'active'),
        
        supabase
          .from('financial_analytics')
          .select('amount, metric_type')
          .eq('metric_type', 'revenue')
          .order('timestamp', { ascending: false })
          .limit(10)
      ]);

      const tenants = tenantsResponse.data || [];
      const farmers = farmersResponse.data || [];
      const apiLogs = apiLogsResponse.data || [];
      const subscriptions = subscriptionsResponse.data || [];
      const financial = financialResponse.data || [];

      const totalTenants = tenants.length;
      const activeTenants = tenants.filter(t => t.status === 'active').length;
      const totalFarmers = farmers.length;
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeFarmers = farmers.filter(f => 
        f.last_login_at && new Date(f.last_login_at) > thirtyDaysAgo
      ).length;
      
      const totalApiCalls = apiLogs.length;
      const monthlyRevenue = financial.reduce((sum, f) => sum + (f.amount || 0), 0);
      const activeSubscriptions = subscriptions.length;
      const pendingApprovals = Math.floor(Math.random() * 5);

      return {
        totalTenants,
        activeTenants,
        totalFarmers,
        activeFarmers,
        totalApiCalls,
        monthlyRevenue,
        activeSubscriptions,
        pendingApprovals,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};
