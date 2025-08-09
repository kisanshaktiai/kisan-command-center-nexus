
import { useQuery } from '@tanstack/react-query';
import { tenantManagementService } from '../services/TenantManagementService';
import { tenantQueries } from '@/data/queries/tenantQueries';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { TenantType, TenantStatus } from '@/types/tenant';

export interface UseTenantDataOptions {
  filters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

export const useTenantData = (options: UseTenantDataOptions = {}) => {
  const { filters = {} } = options;
  const { handleError } = useErrorHandler({ 
    component: 'TenantData',
    fallbackMessage: 'Failed to load tenants' 
  });

  // Convert string filters to proper enum types for the API
  const apiFilters = {
    search: filters.search,
    type: filters.type ? filters.type as TenantType : undefined,
    status: filters.status ? filters.status as TenantStatus : undefined,
  };

  const {
    data: tenants = [],
    isLoading,
    error
  } = useQuery({
    queryKey: tenantQueries.list(filters),
    queryFn: async () => {
      const result = await tenantManagementService.getAllTenants(apiFilters);
      if (!result.success) {
        const errorToThrow = new Error(result.error || 'Failed to fetch tenants');
        handleError(errorToThrow, 'fetch tenants');
        throw errorToThrow;
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on validation errors (4xx)
      if (error instanceof Error && error.message.includes('validation')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  return {
    tenants,
    isLoading,
    error
  };
};
