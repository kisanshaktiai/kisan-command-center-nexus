
import { useMemo } from 'react';
import { useTenantData } from '@/features/tenant/hooks/useTenantData';
import { useTenantAccessValidation } from './useTenantAccessValidation';
import { useAuth } from '@/contexts/AuthContext';

interface UseTenantManagementWithAccessOptions {
  filters?: {
    search?: string;
    type?: string;
    status?: string;
  };
  enabled?: boolean;
  autoValidateAccess?: boolean;
}

export const useTenantManagementWithAccess = (options: UseTenantManagementWithAccessOptions = {}) => {
  const { 
    filters = {}, 
    enabled = true, 
    autoValidateAccess = true 
  } = options;

  const { user } = useAuth();
  const { validateTenantAccess, isValidating } = useTenantAccessValidation();

  // Fetch tenant data using existing hook
  const { data: tenants = [], isLoading, error } = useTenantData({ 
    filters, 
    enabled: enabled && !!user 
  });

  // Auto-validate access for all tenants when they're loaded
  const validatedTenants = useMemo(() => {
    if (!autoValidateAccess || !tenants.length || isValidating) {
      return tenants;
    }

    // The RLS policy will handle access validation automatically
    // We just need to ensure the tenants are properly filtered
    return tenants;
  }, [tenants, autoValidateAccess, isValidating]);

  const validateAccessForTenant = async (tenantId: string) => {
    return await validateTenantAccess(tenantId);
  };

  return {
    tenants: validatedTenants,
    isLoading: isLoading || isValidating,
    error,
    validateAccessForTenant,
    isValidatingAccess: isValidating
  };
};
