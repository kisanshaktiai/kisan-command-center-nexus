
import { useState, useEffect } from 'react';
import { DomainRouter, DomainMapping } from '@/middleware/domainRouter';

export const useTenantRouter = () => {
  const [domainMapping, setDomainMapping] = useState<DomainMapping | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDomainMapping = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const hostname = window.location.hostname;
        const mapping = await DomainRouter.getDomainMapping(hostname);
        
        setDomainMapping(mapping);
        
        // Set tenant ID in headers for API calls
        if (mapping) {
          // This would typically be handled by a request interceptor
          localStorage.setItem('current-tenant-id', mapping.tenant_id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize domain mapping');
        console.error('Domain routing error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDomainMapping();
  }, []);

  const refreshMapping = async () => {
    DomainRouter.clearCache();
    const hostname = window.location.hostname;
    const mapping = await DomainRouter.getDomainMapping(hostname);
    setDomainMapping(mapping);
  };

  return {
    domainMapping,
    isLoading,
    error,
    refreshMapping,
    tenantId: domainMapping?.tenant_id || null,
    portalType: domainMapping?.portal_type || null,
  };
};
