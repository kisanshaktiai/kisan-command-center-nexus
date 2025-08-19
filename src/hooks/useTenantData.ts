
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { convertDatabaseTenant, Tenant } from '@/types/tenant';

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
    queryKey: ['tenant-data', filters],
    queryFn: async (): Promise<Tenant[]> => {
      console.log('Loading tenant data with filters:', filters);

      let query = supabase
        .from('tenants')
        .select(`
          *,
          tenant_branding (*),
          tenant_features (*)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,owner_email.ilike.%${filters.search}%`);
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading tenant data:', error);
        throw new Error(`Failed to load tenants: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      // Transform the data using the converter
      const transformedTenants = data.map(convertDatabaseTenant);

      console.log('Successfully loaded tenant data:', transformedTenants.length, 'tenants');
      return transformedTenants;
    },
    enabled: enabled,
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
    refetchInterval: false,
    throwOnError: false
  });
};
