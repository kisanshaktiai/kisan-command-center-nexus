
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

export const useTenantData = ({ tenantId, enabled = true }: UseTenantDataOptions) => {
  return useQuery({
    queryKey: ['tenant-data', tenantId],
    queryFn: async (): Promise<TenantData> => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, name, subscription_plan, status, owner_name, owner_email, owner_phone, business_registration, business_address, metadata')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('Error loading tenant data:', error);
        throw error;
      }

      return {
        id: tenant.id,
        name: tenant.name || 'Unknown Tenant',
        subscription_plan: tenant.subscription_plan || 'Shakti_Growth',
        status: tenant.status || 'active',
        owner_name: tenant.owner_name || 'Loading...',
        owner_email: tenant.owner_email || '',
        owner_phone: tenant.owner_phone || '',
        business_registration: tenant.business_registration || '',
        business_address: typeof tenant.business_address === 'string' ? tenant.business_address : '',
        metadata: typeof tenant.metadata === 'object' && tenant.metadata !== null ? tenant.metadata as Record<string, any> : {}
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};
