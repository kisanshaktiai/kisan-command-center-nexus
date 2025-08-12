
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to create tenant-aware query keys that prevent cross-tenant data leakage
 */
export const useTenantQueryKey = () => {
  const { user } = useAuth();
  const tenantId = user?.id || null;

  const createTenantKey = (baseKey: (string | number | object)[]) => {
    if (!tenantId) {
      console.warn('Creating query key without tenant ID - potential security risk');
      return ['no-tenant', ...baseKey];
    }
    
    return [`tenant:${tenantId}`, ...baseKey];
  };

  return {
    tenantId,
    createTenantKey,
  };
};
