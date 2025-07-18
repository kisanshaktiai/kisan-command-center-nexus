
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  type: string;
  subscription_plan: string | null;
  status: string;
  settings: Record<string, any> | null;
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
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error(`Authentication error: ${userError.message}`);
        }
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { data, error: queryError } = await supabase
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
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (queryError) {
          throw new Error(`Query error: ${queryError.message}`);
        }
        
        const mappedTenants = (data || [])
          .map(item => {
            if (!item.tenants || typeof item.tenants !== 'object') {
              console.warn('Invalid tenant data:', item);
              return null;
            }
            
            return {
              id: item.tenants.id,
              name: item.tenants.name || 'Unknown Tenant',
              slug: item.tenants.slug || '',
              type: item.tenants.type || 'unknown',
              subscription_plan: item.tenants.subscription_plan,
              status: item.tenants.status || 'inactive',
              settings: item.tenants.settings || {},
              created_at: item.tenants.created_at
            } as Tenant;
          })
          .filter((tenant): tenant is Tenant => tenant !== null);
        
        console.log('Fetched tenants:', mappedTenants);
        return mappedTenants;
        
      } catch (err) {
        console.error('Error fetching tenants:', err);
        throw err;
      }
    },
    enabled: true,
    retry: 2,
    retryDelay: 1000,
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
      console.log('Switched to tenant:', tenant);
    } else {
      console.warn('Tenant not found:', tenantId);
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
