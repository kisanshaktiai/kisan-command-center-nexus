
import { useQuery } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { TenantMetrics } from '@/types/tenantView';

export const useTenantMetrics = (tenantId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['tenant-metrics', tenantId],
    queryFn: async (): Promise<TenantMetrics> => {
      const result = await tenantService.getMetrics(tenantId);
      if (!result.success) {
        // Return default metrics on error
        return {
          usageMetrics: {
            farmers: { current: 0, limit: 1000, percentage: 0 },
            dealers: { current: 0, limit: 50, percentage: 0 },
            products: { current: 0, limit: 100, percentage: 0 },
            storage: { current: 0, limit: 10, percentage: 0 },
            apiCalls: { current: 0, limit: 10000, percentage: 0 }
          },
          growthTrends: {
            farmers: [0, 0, 0, 0, 0, 0, 0],
            revenue: [0, 0, 0, 0, 0, 0, 0],
            apiUsage: [0, 0, 0, 0, 0, 0, 0]
          },
          healthScore: 50,
          lastActivityDate: new Date().toISOString()
        };
      }
      return result.data;
    },
    enabled: enabled && !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};
