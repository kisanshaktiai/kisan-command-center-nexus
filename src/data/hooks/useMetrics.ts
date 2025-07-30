
import { useQuery } from '@tanstack/react-query';
import { metricsService } from '@/domain/metrics/metricsService';

export const useSystemMetrics = () => {
  return useQuery({
    queryKey: ['system-metrics'],
    queryFn: metricsService.getSystemMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useFinancialMetrics = (dateRange?: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ['financial-metrics', dateRange],
    queryFn: () => metricsService.getFinancialMetrics(dateRange),
    enabled: !!dateRange,
  });
};

export const useResourceMetrics = () => {
  return useQuery({
    queryKey: ['resource-metrics'],
    queryFn: metricsService.getResourceMetrics,
    refetchInterval: 15000, // Refetch every 15 seconds for resource monitoring
  });
};

export const useTenantMetrics = (tenantId: string) => {
  return useQuery({
    queryKey: ['tenant-metrics', tenantId],
    queryFn: () => metricsService.getTenantMetrics(tenantId),
    enabled: !!tenantId,
  });
};
