
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTenantRouter } from '@/hooks/useTenantRouter';
import { apiGateway } from '@/services/apiGateway';

interface TenantContextValue {
  tenant: any | null;
  branding: any | null;
  features: any | null;
  isLoading: boolean;
  error: string | null;
  tenantId: string | null;
  portalType: string | null;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export const TenantContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { domainMapping, tenantId, portalType, isLoading: routerLoading } = useTenantRouter();
  const [tenant, setTenant] = useState<any | null>(null);
  const [branding, setBranding] = useState<any | null>(null);
  const [features, setFeatures] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenantData = async () => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Load tenant details
      const tenantResponse = await apiGateway.getTenantDetails(tenantId);
      if (tenantResponse.success) {
        setTenant(tenantResponse.data);
        // Handle features differently since tenant_features might not exist
        const tenantFeatures = tenantResponse.data?.features || {};
        setFeatures(tenantFeatures);
      }

      // Load branding
      const brandingResponse = await apiGateway.getTenantBranding(tenantId);
      if (brandingResponse.success) {
        setBranding(brandingResponse.data);
        
        // Apply branding to DOM
        if (brandingResponse.data) {
          applyBranding(brandingResponse.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant data');
      console.error('Tenant context error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyBranding = (brandingData: any) => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    if (brandingData.primary_color) {
      root.style.setProperty('--tenant-primary', brandingData.primary_color);
    }
    if (brandingData.secondary_color) {
      root.style.setProperty('--tenant-secondary', brandingData.secondary_color);
    }
    if (brandingData.accent_color) {
      root.style.setProperty('--tenant-accent', brandingData.accent_color);
    }
    if (brandingData.app_name) {
      document.title = brandingData.app_name;
    }
  };

  useEffect(() => {
    if (!routerLoading) {
      loadTenantData();
    }
  }, [tenantId, routerLoading]);

  const refreshTenant = async () => {
    await loadTenantData();
  };

  const contextValue: TenantContextValue = {
    tenant,
    branding,
    features,
    isLoading: routerLoading || isLoading,
    error,
    tenantId,
    portalType,
    refreshTenant,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantContextProvider');
  }
  return context;
};
