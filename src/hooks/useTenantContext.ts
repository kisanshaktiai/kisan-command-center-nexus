
import { useContext, createContext } from 'react';

interface TenantContextType {
  tenantId: string | null;
  tenantSlug: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  tenantSlug: null
});

export const useTenantContext = () => {
  const context = useContext(TenantContext);
  
  // For now, return a mock tenant ID for development
  // In a real implementation, this would come from the auth context or URL
  return {
    tenantId: context.tenantId || 'mock-tenant-id',
    tenantSlug: context.tenantSlug || 'mock-tenant'
  };
};

export const TenantProvider = TenantContext.Provider;
