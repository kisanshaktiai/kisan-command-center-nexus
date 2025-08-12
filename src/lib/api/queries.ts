
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realDataService } from '@/lib/services/realDataService';
import { useTenantQueryKey } from '@/hooks/useTenantQueryKey';

// Platform alerts query with tenant-aware keys and better error handling
export const usePlatformAlerts = () => {
  const { createTenantKey } = useTenantQueryKey();
  
  return useQuery({
    queryKey: createTenantKey(['platform-alerts']),
    queryFn: async () => {
      try {
        return await realDataService.fetchAlerts();
      } catch (error) {
        console.error('Failed to fetch platform alerts:', error);
        // Let React Query handle retries, don't return fallback here
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on permission or schema errors
      if (error?.message?.includes('permission') || error?.message?.includes('column')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// System health query with tenant-aware keys
export const useSystemHealth = () => {
  const { createTenantKey } = useTenantQueryKey();
  
  return useQuery({
    queryKey: createTenantKey(['system-health']),
    queryFn: async () => {
      try {
        return await realDataService.fetchSystemHealth();
      } catch (error) {
        console.error('Failed to fetch system health:', error);
        throw error;
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: (failureCount, error) => {
      // Don't retry on schema errors
      if (error?.message?.includes('column') || error?.message?.includes('relation')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Financial metrics query with tenant-aware keys
export const useFinancialMetrics = () => {
  const { createTenantKey } = useTenantQueryKey();
  
  return useQuery({
    queryKey: createTenantKey(['financial-metrics']),
    queryFn: async () => {
      try {
        return await realDataService.fetchFinancialMetrics();
      } catch (error) {
        console.error('Failed to fetch financial metrics:', error);
        throw error;
      }
    },
    refetchInterval: 60000, // Refetch every minute
    retry: (failureCount, error) => {
      // Don't retry on schema errors
      if (error?.message?.includes('column') || error?.message?.includes('relation')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// SIM detection query with tenant-aware keys
export const useSIMDetection = () => {
  const { createTenantKey } = useTenantQueryKey();
  
  return useQuery({
    queryKey: createTenantKey(['sim-detection']),
    queryFn: async () => {
      try {
        return await realDataService.fetchSIMDetectionData();
      } catch (error) {
        console.error('Failed to fetch SIM detection data:', error);
        // For SIM detection, provide fallback on error
        return { detected: false, info: null, timestamp: new Date().toISOString() };
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
    retry: 1, // Only retry once for SIM detection
  });
};

// Alert mutation hooks with tenant-aware cache invalidation
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  const { createTenantKey } = useTenantQueryKey();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      try {
        return await realDataService.acknowledgeAlert(alertId);
      } catch (error) {
        console.error('Failed to acknowledge alert:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createTenantKey(['platform-alerts']) });
    },
    onError: (error) => {
      console.error('Error acknowledging alert:', error);
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  const { createTenantKey } = useTenantQueryKey();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      try {
        return await realDataService.resolveAlert(alertId);
      } catch (error) {
        console.error('Failed to resolve alert:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createTenantKey(['platform-alerts']) });
    },
    onError: (error) => {
      console.error('Error resolving alert:', error);
    },
  });
};

// Alias for backwards compatibility
export const useSystemHealthMetrics = useSystemHealth;

// Resource utilization query with tenant-aware keys
export const useResourceUtilization = () => {
  const { createTenantKey } = useTenantQueryKey();
  
  return useQuery({
    queryKey: createTenantKey(['resource-utilization']),
    queryFn: async () => {
      try {
        return await realDataService.fetchResourceUtilization();
      } catch (error) {
        console.error('Failed to fetch resource utilization:', error);
        throw error;
      }
    },
    refetchInterval: 15000, // Refetch every 15 seconds
    retry: (failureCount, error) => {
      // Don't retry on schema errors
      if (error?.message?.includes('column') || error?.message?.includes('relation')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};
