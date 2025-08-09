
import { useState, useEffect } from 'react';
import { tenantContextService, TenantContext } from '@/middleware/TenantContextMiddleware';

export const useTenantContext = () => {
  const [context, setContext] = useState<TenantContext>(
    tenantContextService.getCurrentContext()
  );

  useEffect(() => {
    const unsubscribe = tenantContextService.subscribe(setContext);
    return unsubscribe;
  }, []);

  const setTenant = (tenantId: string | null) => {
    return tenantContextService.setTenantById(tenantId);
  };

  const clearTenant = () => {
    tenantContextService.clearContext();
  };

  const refreshTenant = () => {
    if (context.tenantId) {
      tenantContextService.invalidateCache(context.tenantId);
      return tenantContextService.setTenantById(context.tenantId);
    }
  };

  return {
    ...context,
    setTenant,
    clearTenant,
    refreshTenant
  };
};
