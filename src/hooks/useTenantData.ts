
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TenantData {
  id: string;
  name: string;
  subscription_plan: string;
  status: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: string;
  metadata?: Record<string, any>;
}

interface UseTenantDataOptions {
  tenantId: string;
  enabled?: boolean;
}

// Centralized query key factory for consistency
const getTenantQueryKey = (tenantId: string) => ['tenant-data', tenantId];

// Safe type guard for tenant data
const isTenantData = (data: any): data is TenantData => {
  return data && 
         typeof data === 'object' && 
         typeof data.id === 'string' &&
         typeof data.name === 'string';
};

// Safe property accessor with type checking
const safeGetString = (obj: any, key: string, defaultValue: string = ''): string => {
  try {
    if (!obj || typeof obj !== 'object') return defaultValue;
    const value = obj[key];
    return typeof value === 'string' ? value : defaultValue;
  } catch {
    return defaultValue;
  }
};

const safeGetObject = (obj: any, key: string, defaultValue: Record<string, any> = {}): Record<string, any> => {
  try {
    if (!obj || typeof obj !== 'object') return defaultValue;
    const value = obj[key];
    return value && typeof value === 'object' && !Array.isArray(value) ? value : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const useTenantData = ({ tenantId, enabled = true }: UseTenantDataOptions) => {
  return useQuery({
    queryKey: getTenantQueryKey(tenantId),
    queryFn: async (): Promise<TenantData> => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      console.log('Loading tenant data for:', tenantId);

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, name, subscription_plan, status, owner_name, owner_email, owner_phone, business_registration, business_address, metadata')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('Error loading tenant data:', error);
        throw new Error(`Failed to load tenant: ${error.message}`);
      }

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Safely transform the data with proper type checking
      const transformedTenant: TenantData = {
        id: safeGetString(tenant, 'id', tenantId),
        name: safeGetString(tenant, 'name', 'Unknown Tenant'),
        subscription_plan: safeGetString(tenant, 'subscription_plan', 'Shakti_Growth'),
        status: safeGetString(tenant, 'status', 'active'),
        owner_name: safeGetString(tenant, 'owner_name', ''),
        owner_email: safeGetString(tenant, 'owner_email', ''),
        owner_phone: safeGetString(tenant, 'owner_phone', ''),
        business_registration: safeGetString(tenant, 'business_registration', ''),
        business_address: safeGetString(tenant, 'business_address', ''),
        metadata: safeGetObject(tenant, 'metadata', {})
      };

      // Validate the transformed data
      if (!isTenantData(transformedTenant)) {
        throw new Error('Invalid tenant data structure');
      }

      console.log('Successfully loaded tenant data:', transformedTenant.name);
      return transformedTenant;
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication or permission errors
      if (error?.message?.includes('permission') || error?.message?.includes('auth')) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    // Prevent multiple requests for the same tenant
    refetchInterval: false,
    // Add network error handling
    throwOnError: false
  });
};

// Export query key factory for external cache invalidation
export { getTenantQueryKey };
