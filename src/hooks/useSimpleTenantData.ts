
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseSimpleTenantDataProps {
  tenantId: string;
  enabled?: boolean;
}

export const useSimpleTenantData = ({ tenantId, enabled = true }: UseSimpleTenantDataProps) => {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, subscription_plan, status, created_at')
        .eq('id', tenantId)
        .single();

      if (error) {
        throw new Error(`Failed to load tenant: ${error.message}`);
      }

      return data;
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};
