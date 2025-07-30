
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Platform Alerts Queries
export const usePlatformAlerts = (filter: string = 'all') => {
  return useQuery({
    queryKey: ['platform-alerts', filter],
    queryFn: async () => {
      let query = supabase
        .from('platform_alerts')
        .select('*')
        .order('triggered_at', { ascending: false });

      if (filter !== 'all') {
        if (filter === 'unresolved') {
          query = query.in('status', ['active', 'acknowledged']);
        } else {
          query = query.eq('status', filter);
        }
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });
};

// System Health Metrics Queries
export const useSystemHealthMetrics = (refreshInterval: number = 30000) => {
  return useQuery({
    queryKey: ['system-health-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_metrics')
        .select('*')
        .eq('metric_type', 'system')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: refreshInterval,
  });
};

// Financial Analytics Queries
export const useFinancialAnalytics = (timeRange: string = '30d') => {
  return useQuery({
    queryKey: ['financial-analytics', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // 1 minute
  });
};

// Resource Utilization Queries
export const useResourceUtilization = (refreshInterval: number = 30000) => {
  return useQuery({
    queryKey: ['resource-utilization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_utilization')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: refreshInterval,
  });
};

// Admin Notifications Queries
export const useAdminNotifications = () => {
  return useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('recipient_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
};

// Mutations for alerts
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('platform_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('platform_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
    },
  });
};
