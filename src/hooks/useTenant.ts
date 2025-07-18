import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  subscription_plan: string | null;
  status: string;
  settings: Record<string, any>;
  created_at: string;
  branding?: {
    logo_url?: string;
    company_name?: string;
    tagline?: string;
    primary_color?: string;
  };
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
  
  const queryResult = useQuery({
    queryKey: ['user-tenants'],
    queryFn: async () => {
      const userResponse = await supabase.auth.getUser();
      
      if (!userResponse.data.user) {
        throw new Error('User not authenticated');
      }

      const tenantsResponse = await supabase
        .from('user_tenants')
        .select(`
          tenant_id,
          tenants!inner (
            id,
            name,
            slug,
            type,
            subscription_plan,
            status,
            settings,
            created_at
          )
        `)
        .eq('user_id', userResponse.data.user.id)
        .eq('is_active', true);

      if (tenantsResponse.error) {
        throw tenantsResponse.error;
      }
      
      const mappedTenants = tenantsResponse.data?.map(item => item.tenants).filter(Boolean) || [];
      return mappedTenants;
    },
    enabled: true,
  });

  const tenants = queryResult.data || [];
  const isLoading = queryResult.isLoading;
  const error = queryResult.error;

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

  const contextValue: TenantContextType = {
    currentTenant,
    tenants,
    isLoading,
    switchTenant,
    error: error as Error | null,
  };

  return React.createElement(
    TenantContext.Provider,
    { value: contextValue },
    children
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};