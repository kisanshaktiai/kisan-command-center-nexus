
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SimpleTenantData {
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

interface UseSimpleTenantDataOptions {
  tenantId: string;
  enabled?: boolean;
}

export const useSimpleTenantData = ({ tenantId, enabled = true }: UseSimpleTenantDataOptions) => {
  return useQuery({
    queryKey: ['simple-tenant-data', tenantId],
    queryFn: async (): Promise<SimpleTenantData | null> => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      console.log('🔍 Fetching tenant data for:', tenantId);

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          subscription_plan,
          status,
          owner_name,
          owner_email,
          owner_phone,
          business_registration,
          business_address,
          metadata
        `)
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('❌ Error fetching tenant:', error);
        throw new Error(`Failed to fetch tenant: ${error.message}`);
      }

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      console.log('✅ Successfully fetched tenant:', tenant.name);
      return tenant;
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
