
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface AdminDashboardData {
  // Metrics
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
  recentApiLogs: any[];
  activeSessions: any[];
  unreadNotifications: any[];
  latestSystemMetrics: any[];
}

export const useOptimizedAdminDashboard = () => {
  const [realtimeData, setRealtimeData] = useState({
    recentApiLogs: [],
    activeSessions: [],
    unreadNotifications: [],
    latestSystemMetrics: []
  });

  // Main dashboard data with optimized caching
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard-consolidated'],
    queryFn: async (): Promise<AdminDashboardData> => {
      console.log('Fetching consolidated dashboard data...');
      
      // Batch all queries with specific column selection
      const [
        tenantsResponse,
        farmersResponse,
        apiLogsResponse,
        subscriptionsResponse,
        financialResponse,
        sessionsResponse,
        notificationsResponse,
        systemMetricsResponse
      ] = await Promise.all([
        // Optimized tenant query - only needed columns
        supabase
          .from('tenants')
          .select('id, status, created_at')
          .order('created_at', { ascending: false }),
        
        // Optimized farmers query
        supabase
          .from('farmers')
          .select('id, created_at, last_login_at')
          .order('created_at', { ascending: false }),
        
        // Limited API logs - last 24 hours only, paginated
        supabase
          .from('api_logs')
          .select('id, created_at, status_code, endpoint')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Active subscriptions only
        supabase
          .from('tenant_subscriptions')
          .select('id, status, tenant_id')
          .eq('status', 'active'),
        
        // Financial metrics - last 30 days only
        supabase
          .from('financial_metrics')
          .select('amount, metric_name, timestamp')
          .eq('metric_name', 'monthly_revenue')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('timestamp', { ascending: false })
          .limit(10),

        // Active sessions
        supabase
          .from('active_sessions')
          .select('id, user_id, last_active_at, is_active')
          .eq('is_active', true)
          .limit(50),

        // Unread notifications only
        supabase
          .from('platform_notifications')
          .select('id, title, message, severity, created_at')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(20),

        // Latest system metrics - last 10 only, without status column
        supabase
          .from('system_health_metrics')
          .select('id, metric_name, value, timestamp')
          .order('timestamp', { ascending: false })
          .limit(10)
      ]);

      // Process and calculate metrics
      const tenants = tenantsResponse.data || [];
      const farmers = farmersResponse.data || [];
      const apiLogs = apiLogsResponse.data || [];
      const subscriptions = subscriptionsResponse.data || [];
      const financial = financialResponse.data || [];
      const sessions = sessionsResponse.data || [];
      const notifications = notificationsResponse.data || [];
      const systemMetrics = systemMetricsResponse.data || [];

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
      
      // System health from latest metrics
      const latestHealthMetric = systemMetrics.find(m => m.metric_name === 'health_score');
      const systemHealth = latestHealthMetric ? Number(latestHealthMetric.value) : 95;
      
      // Mock some calculated metrics
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
        recentApiLogs: apiLogs,
        activeSessions: sessions,
        unreadNotifications: notifications,
        latestSystemMetrics: systemMetrics
      };
    },
    // Optimized caching strategy
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // No auto-refetch
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Consolidated real-time subscription (limited channels)
  useEffect(() => {
    console.log('Setting up optimized real-time subscriptions...');
    
    // Single consolidated channel for critical real-time updates only
    const consolidatedChannel = supabase
      .channel('admin-dashboard-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'platform_notifications'
      }, (payload) => {
        console.log('New notification:', payload);
        setRealtimeData(prev => ({
          ...prev,
          unreadNotifications: [payload.new, ...prev.unreadNotifications.slice(0, 19)]
        }));
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_sessions'
      }, (payload) => {
        console.log('Session update:', payload);
        if (payload.eventType === 'INSERT') {
          setRealtimeData(prev => ({
            ...prev,
            activeSessions: [payload.new, ...prev.activeSessions.slice(0, 49)]
          }));
        } else if (payload.eventType === 'DELETE') {
          setRealtimeData(prev => ({
            ...prev,
            activeSessions: prev.activeSessions.filter(s => s.id !== payload.old.id)
          }));
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'api_logs'
      }, (payload) => {
        // Only track failed API calls for real-time alerts
        if (payload.new.status_code >= 400) {
          console.log('API failure:', payload);
          setRealtimeData(prev => ({
            ...prev,
            recentApiLogs: [payload.new, ...prev.recentApiLogs.slice(0, 99)]
          }));
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions...');
      supabase.removeChannel(consolidatedChannel);
    };
  }, []);

  // Merge static and real-time data
  const mergedData = dashboardData ? {
    ...dashboardData,
    // Update with real-time data if available
    activeSessions: realtimeData.activeSessions.length > 0 ? realtimeData.activeSessions : dashboardData.activeSessions,
    unreadNotifications: realtimeData.unreadNotifications.length > 0 ? realtimeData.unreadNotifications : dashboardData.unreadNotifications,
    recentApiLogs: realtimeData.recentApiLogs.length > 0 ? realtimeData.recentApiLogs : dashboardData.recentApiLogs,
  } : null;

  return {
    data: mergedData,
    isLoading,
    error,
    refetch,
    // Expose real-time status
    hasRealtimeUpdates: Object.values(realtimeData).some(arr => arr.length > 0)
  };
};
