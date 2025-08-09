
import { useQuery } from '@tanstack/react-query';
import { enhancedApiFactory } from '@/services/api/EnhancedApiFactory';
import { Tenant, TenantFilters } from '@/types/tenant';
import { TenantType, TenantStatus, SubscriptionPlan } from '@/types/enums';

interface UseTenantDataOptions {
  filters?: {
    search?: string;
    type?: string;
    status?: string;
  };
  enabled?: boolean;
}

// Helper functions to validate and convert filter strings to enums
const validateTenantType = (type: string): TenantType | undefined => {
  return Object.values(TenantType).includes(type as TenantType) 
    ? (type as TenantType) 
    : undefined;
};

const validateTenantStatus = (status: string): TenantStatus | undefined => {
  return Object.values(TenantStatus).includes(status as TenantStatus) 
    ? (status as TenantStatus) 
    : undefined;
};

export const useTenantData = (options: UseTenantDataOptions = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['tenants', filters],
    queryFn: async () => {
      // Convert and validate filter parameters
      const apiFilters: TenantFilters = {
        search: filters.search,
        type: filters.type ? validateTenantType(filters.type) : undefined,
        status: filters.status ? validateTenantStatus(filters.status) : undefined,
      };

      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(apiFilters).filter(([, value]) => value !== undefined)
      );

      const response = await enhancedApiFactory.get<Tenant[]>('tenants', cleanFilters);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tenants');
      }

      return response.data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
