
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantAccessValidation } from './useTenantAccessValidation';
import { useEffect } from 'react';

interface TenantData {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  status: string;
  created_at: string;
}

interface UseEnhancedTenantDataOptions {
  tenantId: string;
  enabled?: boolean;
  autoValidateAccess?: boolean;
}

export const useEnhancedTenantData = ({ 
  tenantId, 
  enabled = true, 
  autoValidateAccess = true 
}: UseEnhancedTenantDataOptions) => {
  const { validateTenantAccess, isValidating } = useTenantAccessValidation();

  // Auto-validate tenant access when tenantId changes
  useEffect(() => {
    if (autoValidateAccess && tenantId && enabled) {
      validateTenantAccess(tenantId);
    }
  }, [tenantId, autoValidateAccess, enabled, validateTenantAccess]);

  const tenantQuery = useQuery({
    queryKey: ['enhanced-tenant-data', tenantId],
    queryFn: async (): Promise<TenantData> => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      console.log('Fetching enhanced tenant data for:', tenantId);

      // The RLS policy will automatically ensure user-tenant relationship exists
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, name, slug, subscription_plan, status, created_at')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('Error fetching tenant data:', error);
        throw new Error(`Failed to fetch tenant: ${error.message}`);
      }

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      console.log('Successfully fetched enhanced tenant data:', tenant.name);
      return tenant;
    },
    enabled: enabled && !!tenantId && !isValidating,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on permission errors
      if (error?.message?.includes('permission') || error?.message?.includes('policy')) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  return {
    ...tenantQuery,
    isValidatingAccess: isValidating,
    validateAccess: () => validateTenantAccess(tenantId)
  };
};
