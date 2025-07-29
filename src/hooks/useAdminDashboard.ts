
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface AdminDashboardData {
  // Platform metrics
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
  
  // Real-time data (limited)
  activeSessions: any[];
  recentNotifications: any[];
  criticalAlerts: any[];
}

interface MetricChange {
  value: number;
  type: 'increase' | 'decrease';
  period: string;
}

// Shared cache keys
export const ADMIN_DASHBOARD_KEYS = {
  overview: ['admin-dashboard-overview'],
  realtimeData: ['admin-dashboard-realtime'],
  systemMetrics: ['admin-dashboard-system'],
} as const;

export const useAdminDashboard = () => {
  const [previousMetrics, setPreviousMetrics] = useState<AdminDashboardData | null>(null);

  // Main dashboard data with optimized caching
  const { 
    data: dashboardData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ADMIN_DASHBOARD_KEYS.overview,
    queryFn: async (): Promise<AdminDashboardData> => {
      console.log('Fetching consolidated admin dashboard data...');
      
      // Use parallel queries with specific column selection
      const [
        tenantsResult,
        farmersResult,
        apiLogsResult,
        subscriptionsResult,
        financialResult,
        sessionsResult,
        notificationsResult
      ] = await Promise.all([
        // Tenants - only essential columns
        supabase
          .from('tenants')
          .select('id, status, created_at, subscription_plan')
          .order('created_at', { ascending: false }),
        
        // Farmers - only essential columns  
        supabase
          .from('farmers')
          .select('id, created_at, last_login_at, tenant_id')
          .order('created_at', { ascending: false }),
        
        // API logs - limited to last 24h with pagination
        supabase
          .from('api_logs')
          .select('id, created_at, status_code, tenant_id')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1000), // Limit large datasets
        
        // Active subscriptions only
        supabase
          .from('tenant_subscriptions')
          .select('id, status, tenant_id, current_period_start, current_period_end')
          .eq('status', 'active'),
        
        // Financial metrics - recent only
        supabase
          .from('financial_metrics')
          .select('amount, metric_name, timestamp')
          .eq('metric_name', 'monthly_revenue')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('timestamp', { ascending: false })
          .limit(30),
        
        // Active sessions - limited columns
        supabase
          .from('active_sessions')
          .select('id, user_id, tenant_id, last_active_at, is_active')
          .eq('is_active', true)
          .limit(100),
        
        // Recent critical notifications only
        supabase
          .from('platform_notifications')
          .select('id, title, message, severity, created_at, is_read')
          .in('severity', ['error', 'warning'])
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      // Process data efficiently
      const tenants = tenantsResult.data || [];
      const farmers = farmersResult.data || [];
      const apiLogs = apiLogsResult.data || [];
      const subscriptions = subscriptionsResult.data || [];
      const financial = financialResult.data || [];
      const sessions = sessionsResult.data || [];
      const notifications = notificationsResult.data || [];

      // Calculate metrics
      const totalTenants = tenants.length;
      const activeTenants = tenants.filter(t => t.status === 'active').length;
      const totalFarmers = farmers.length;
      
      // Active farmers (logged in within last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeFarmers = farmers.filter(f => 
        f.last_login_at && new Date(f.last_login_at) > thirtyDaysAgo
      ).length;
      
      const totalApiCalls = apiLogs.length;
      const monthlyRevenue = financial.reduce((sum, f) => sum + (f.amount || 0), 0);
      const activeSubscriptions = subscriptions.length;
      
      // Mock system metrics (these would come from actual monitoring)
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
        pendingApprovals,
        activeSessions: sessions,
        recentNotifications: notifications,
        criticalAlerts: notifications.filter(n => n.severity === 'error')
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - much longer than before
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchInterval: false, // Disable aggressive auto-refetch
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: 'always', // Only refetch on mount if stale
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
    if (dashboardData && !previousMetrics) {
      setPreviousMetrics(dashboardData);
    }
  }, [dashboardData, previousMetrics]);

  return {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    getMetricChange: (current: number, key: keyof AdminDashboardData) => 
      getMetricChange(current, previousMetrics?.[key] as number)
  };
};

// Separate hook for real-time data with minimal subscriptions
export const useAdminRealtimeData = () => {
  const [realtimeData, setRealtimeData] = useState({
    newTenants: 0,
    activeSessionsCount: 0,
    criticalAlerts: 0,
    systemStatus: 'healthy' as 'healthy' | 'warning' | 'critical'
  });

  useEffect(() => {
    console.log('Setting up optimized real-time subscriptions...');
    
    // Single consolidated real-time channel
    const realtimeChannel = supabase
      .channel('admin-dashboard-updates')
      // Only critical tenant changes
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tenants'
      }, (payload) => {
        console.log('New tenant created:', payload.new);
        setRealtimeData(prev => ({
          ...prev,
          newTenants: prev.newTenants + 1
        }));
      })
      // Only critical notifications
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'platform_notifications',
        filter: 'severity=eq.error'
      }, (payload) => {
        console.log('Critical alert:', payload.new);
        setRealtimeData(prev => ({
          ...prev,
          criticalAlerts: prev.criticalAlerts + 1
        }));
      })
      .subscribe();

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time subscriptions...');
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  return realtimeData;
};
