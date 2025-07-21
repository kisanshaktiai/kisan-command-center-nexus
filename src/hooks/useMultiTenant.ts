
import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { MultiTenantService } from '@/services/multiTenantService';

interface TenantContext {
  tenant_id: string;
  subdomain?: string;
  custom_domain?: string;
  branding: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    app_name: string;
    logo_url?: string;
  };
  features: Record<string, boolean>;
  limits: {
    farmers: number;
    dealers: number;
    products: number;
    storage: number;
    api_calls: number;
  };
}

interface MultiTenantContextType {
  tenant: TenantContext | null;
  isLoading: boolean;
  error: string | null;
  isFeatureEnabled: (feature: string) => boolean;
  checkLimit: (limitType: keyof TenantContext['limits'], currentValue: number) => boolean;
  refreshTenant: () => Promise<void>;
}

const MultiTenantContext = createContext<MultiTenantContextType | undefined>(undefined);

export const MultiTenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeTenant = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const detectedTenant = await MultiTenantService.initializeTenantFromURL();
      setTenant(detectedTenant);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize tenant');
      console.error('MultiTenant: Error initializing tenant:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeTenant();
  }, []);

  const isFeatureEnabled = (feature: string): boolean => {
    return tenant ? MultiTenantService.isFeatureEnabled(feature) : false;
  };

  const checkLimit = (limitType: keyof TenantContext['limits'], currentValue: number): boolean => {
    return tenant ? MultiTenantService.checkLimit(limitType, currentValue) : false;
  };

  const refreshTenant = async () => {
    await initializeTenant();
  };

  const contextValue: MultiTenantContextType = {
    tenant,
    isLoading,
    error,
    isFeatureEnabled,
    checkLimit,
    refreshTenant,
  };

  return (
    <MultiTenantContext.Provider value={contextValue}>
      {children}
    </MultiTenantContext.Provider>
  );
};

export const useMultiTenant = () => {
  const context = useContext(MultiTenantContext);
  if (context === undefined) {
    throw new Error('useMultiTenant must be used within a MultiTenantProvider');
  }
  return context;
};
