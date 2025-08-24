
import { useQuery } from '@tanstack/react-query';
import { tenantService } from '@/services/TenantService';
import { TenantFilters } from '@/types/tenant';

interface UseTenantDataOptions {
  filters?: Partial<TenantFilters>;
  enabled?: boolean;
}

export const useTenantData = (options: UseTenantDataOptions = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['tenants', filters],
    queryFn: async () => {
      const result = await tenantService.getAllTenants(filters);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tenants');
      }
      return result.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
