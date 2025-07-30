
import { useQuery } from '@tanstack/react-query';
import { realDataService } from '@/lib/services/realDataService';

// Platform alerts query
export const usePlatformAlerts = () => {
  return useQuery({
    queryKey: ['platform-alerts'],
    queryFn: realDataService.fetchAlerts,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// System health query
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: realDataService.fetchSystemHealth,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

// Financial metrics query
export const useFinancialMetrics = () => {
  return useQuery({
    queryKey: ['financial-metrics'],
    queryFn: realDataService.fetchFinancialMetrics,
    refetchInterval: 60000, // Refetch every minute
  });
};

// SIM detection query
export const useSIMDetection = () => {
  return useQuery({
    queryKey: ['sim-detection'],
    queryFn: realDataService.fetchSIMDetectionData,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
  });
};
