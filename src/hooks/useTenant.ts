
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Tenant {
  id: string;
  name: string;
  status: string;
  settings: Record<string, any>;
  created_at: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => void;
  error: Error | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  const { data: tenants = [], isLoading, error } = useQuery({
    queryKey: ['user-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tenants')
        .select(`
          tenant_id,
          tenants!inner (
            id,
            name,
            status,
            settings,
            created_at
          )
        `)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true);

      if (error) throw error;
      return data?.map(item => item.tenants).filter(Boolean) || [];
    },
    enabled: true,
  });

  useEffect(() => {
    if (tenants.length > 0 && !currentTenant) {
      setCurrentTenant(tenants[0]);
    }
  }, [tenants, currentTenant]);

  const switchTenant = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  };

  const value: TenantContextType = {
    currentTenant,
    tenants,
    isLoading,
    switchTenant,
    error: error as Error | null,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
