
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realDataService } from '@/lib/services/realDataService';

// Platform alerts query with better error handling
export const usePlatformAlerts = () => {
  return useQuery({
    queryKey: ['platform-alerts'],
    queryFn: async () => {
      try {
        return await realDataService.fetchAlerts();
      } catch (error) {
        console.error('Failed to fetch platform alerts:', error);
        return []; // Return empty array as fallback
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

// System health query with better error handling
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      try {
        return await realDataService.fetchSystemHealth();
      } catch (error) {
        console.error('Failed to fetch system health:', error);
        return []; // Return empty array as fallback
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

// Financial metrics query with better error handling
export const useFinancialMetrics = () => {
  return useQuery({
    queryKey: ['financial-metrics'],
    queryFn: async () => {
      try {
        return await realDataService.fetchFinancialMetrics();
      } catch (error) {
        console.error('Failed to fetch financial metrics:', error);
        return []; // Return empty array as fallback
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

// SIM detection query with better error handling
export const useSIMDetection = () => {
  return useQuery({
    queryKey: ['sim-detection'],
    queryFn: async () => {
      try {
        return await realDataService.fetchSIMDetectionData();
      } catch (error) {
        console.error('Failed to fetch SIM detection data:', error);
        return { detected: false, info: null, timestamp: new Date().toISOString() };
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
    retry: 1, // Only retry once for SIM detection
  });
};

// Alert mutation hooks with better error handling
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  
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
      queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
    },
    onError: (error) => {
      console.error('Error acknowledging alert:', error);
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  
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
      queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
    },
    onError: (error) => {
      console.error('Error resolving alert:', error);
    },
  });
};

// Alias for backwards compatibility
export const useSystemHealthMetrics = useSystemHealth;

// Resource utilization query with better error handling
export const useResourceUtilization = () => {
  return useQuery({
    queryKey: ['resource-utilization'],
    queryFn: async () => {
      try {
        const healthData = await realDataService.fetchSystemHealth();
        return healthData;
      } catch (error) {
        console.error('Failed to fetch resource utilization:', error);
        return []; // Return empty array as fallback
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
