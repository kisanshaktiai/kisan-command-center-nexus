
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { TenantDetectionService, TenantInfo } from '@/services/TenantDetectionService';

interface TenantContextType {
  currentTenant: TenantInfo | null;
  isLoading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectTenant = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tenantService = TenantDetectionService.getInstance();
      const tenant = await tenantService.detectTenant();
      
      if (!tenant) {
        throw new Error('Unable to determine tenant context. Please ensure you are accessing the application through a valid tenant subdomain or contact support.');
      }
      
      setCurrentTenant(tenant);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect tenant. Please check your network connection and try again.';
      console.error('Tenant detection failed:', errorMessage);
      setError(errorMessage);
      setCurrentTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTenant = async () => {
    await detectTenant();
  };

  useEffect(() => {
    detectTenant();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        isLoading,
        error,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
