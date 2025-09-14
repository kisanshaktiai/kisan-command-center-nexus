
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TenantID, createTenantID } from '@/types/tenant';

interface TenantContextValue {
  tenantId: TenantID | null;
  setTenantId: (id: TenantID | null) => void;
  clearTenant: () => void;
  isMultiTenant: boolean;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenantId, setTenantIdState] = useState<TenantID | null>(null);

  // Load tenant ID from session storage on mount
  useEffect(() => {
    const savedTenantId = sessionStorage.getItem('currentTenantId');
    if (savedTenantId) {
      setTenantIdState(createTenantID(savedTenantId));
    }
  }, []);

  const setTenantId = (id: TenantID | null) => {
    setTenantIdState(id);
    if (id) {
      sessionStorage.setItem('currentTenantId', id);
    } else {
      sessionStorage.removeItem('currentTenantId');
    }
  };

  const clearTenant = () => {
    setTenantIdState(null);
    sessionStorage.removeItem('currentTenantId');
  };

  const contextValue: TenantContextValue = {
    tenantId,
    setTenantId,
    clearTenant,
    isMultiTenant: true, // This can be configured based on app settings
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = (): TenantContextValue => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
};

// Hook to ensure tenant ID exists before proceeding
export const useRequiredTenantId = (): TenantID => {
  const { tenantId } = useTenantContext();
  if (!tenantId) {
    throw new Error('Tenant ID is required but not available. Please select a tenant.');
  }
  return tenantId;
};
