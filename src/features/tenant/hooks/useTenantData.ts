
import { useQuery } from '@tanstack/react-query';
import { enhancedApiFactory } from '@/services/api/EnhancedApiFactory';
import { Tenant, TenantFilters, convertDatabaseTenant } from '@/types/tenant';
import { TenantType, TenantStatus, SubscriptionPlan } from '@/types/enums';

interface UseTenantDataOptions {
  tenantId?: string;
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
  const { tenantId, filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: tenantId ? ['tenant', tenantId] : ['tenants', filters],
    queryFn: async () => {
      if (tenantId) {
        const response = await enhancedApiFactory.get<any>(`tenants/${tenantId}`);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch tenant');
        }
        return convertDatabaseTenant(response.data);
      }

      // Convert and validate filter parameters
      const apiFilters: TenantFilters = {
        search: filters.search,
        type: filters.type && filters.type !== 'all' ? (filters.type as any) : undefined,
        status: filters.status && filters.status !== 'all' ? (filters.status as any) : undefined,
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
