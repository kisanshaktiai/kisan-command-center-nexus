
import { useQuery } from '@tanstack/react-query';
import { enhancedApiFactory } from '@/services/api/EnhancedApiFactory';
import { Tenant, TenantFilters, convertDatabaseTenant } from '@/types/tenant';

interface UseTenantDataOptions {
  filters?: {
    search?: string;
    type?: string;
    status?: string;
  };
  enabled?: boolean;
}

export const useTenantData = (options: UseTenantDataOptions = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['tenants', filters],
    queryFn: async () => {
      // Convert and validate filter parameters
      const apiFilters: TenantFilters = {
        search: filters.search,
        type: filters.type && filters.type !== 'all' ? filters.type : undefined,
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
      };

      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(apiFilters).filter(([, value]) => value !== undefined && value !== '')
      );

      const response = await enhancedApiFactory.get<any[]>('tenants', cleanFilters);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tenants');
      }

      // Convert raw database results to properly typed Tenant objects
      const rawTenants = response.data || [];
      return rawTenants.map(convertDatabaseTenant);
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
