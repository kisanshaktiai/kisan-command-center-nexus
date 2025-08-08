
import { useQuery } from '@tanstack/react-query';
import { tenantManagementService } from '../services/TenantManagementService';
import { tenantQueries } from '@/data/queries/tenantQueries';

interface UseTenantDataOptions {
  filters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

export const useTenantData = (options: UseTenantDataOptions = {}) => {
  const { filters = {} } = options;

  const {
    data: tenants = [],
    isLoading,
    error
  } = useQuery({
    queryKey: tenantQueries.list(filters),
    queryFn: async () => {
      const result = await tenantManagementService.getAllTenants(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    tenants,
    isLoading,
    error
  };
};
