
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Tenant, TenantBranding, TenantFeatures, TenantID, createTenantID } from '@/types/tenant';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';

interface UnifiedTenantContext {
  // Core tenant state
  tenant: Tenant | null;
  tenantId: TenantID | null;
  branding: TenantBranding | null;
  features: TenantFeatures | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTenantById: (tenantId: string | null) => Promise<boolean>;
  refreshTenant: () => Promise<void>;
  clearTenant: () => void;
}

const TenantContext = createContext<UnifiedTenantContext | undefined>(undefined);

interface UnifiedTenantProviderProps {
  children: React.ReactNode;
}

export const UnifiedTenantProvider: React.FC<UnifiedTenantProviderProps> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantId, setTenantId] = useState<TenantID | null>(null);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [features, setFeatures] = useState<TenantFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTenantData = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_branding (*),
          tenant_features (*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const loadedTenant: Tenant = {
        ...data,
        id: createTenantID(data.id),
        branding: data.tenant_branding?.[0] || null,
        features: data.tenant_features?.[0] || null,
      };

      setTenant(loadedTenant);
      setTenantId(createTenantID(id));
      setBranding(loadedTenant.branding);
      setFeatures(loadedTenant.features);

      // Apply branding to DOM
      if (loadedTenant.branding) {
        applyBrandingToDOM(loadedTenant.branding);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tenant';
      setError(errorMessage);
      console.error('Tenant loading error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const applyBrandingToDOM = (brandingData: TenantBranding) => {
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

  const setTenantById = async (id: string | null): Promise<boolean> => {
    if (!id) {
      clearTenant();
      return true;
    }
    return await loadTenantData(id);
  };

  const refreshTenant = async () => {
    if (tenantId) {
      await loadTenantData(tenantId);
    }
  };

  const clearTenant = () => {
    setTenant(null);
    setTenantId(null);
    setBranding(null);
    setFeatures(null);
    setError(null);
  };

  const contextValue: UnifiedTenantContext = {
    tenant,
    tenantId,
    branding,
    features,
    isLoading,
    error,
    setTenantById,
    refreshTenant,
    clearTenant,
  };

  return (
    <ErrorBoundary context={{ component: 'UnifiedTenantProvider', level: 'critical' }}>
      <TenantContext.Provider value={contextValue}>
        {children}
      </TenantContext.Provider>
    </ErrorBoundary>
  );
};

export const useUnifiedTenant = (): UnifiedTenantContext => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useUnifiedTenant must be used within a UnifiedTenantProvider');
  }
  return context;
};
