
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { isTenant } from '@/lib/supabase-helpers';

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
      try {
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
        
        // Safely map tenants with type checking
        const mappedTenants = tenantsResponse.data?.map(item => {
          const tenant = item.tenants;
          if (isTenant(tenant)) {
            return {
              id: tenant.id,
              name: tenant.name || 'Unknown',
              slug: tenant.slug || '',
              type: tenant.type || 'basic',
              subscription_plan: tenant.subscription_plan || null,
              status: tenant.status || 'active',
              settings: tenant.settings || {},
              created_at: tenant.created_at || new Date().toISOString()
            } as Tenant;
          }
          return null;
        }).filter(Boolean) || [];
        
        return mappedTenants;
      } catch (error) {
        console.error('Error fetching tenants:', error);
        throw error;
      }
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
    if (tenant && isTenant(tenant)) {
      setCurrentTenant(tenant);
    } else {
      console.error('Invalid tenant selected:', tenantId);
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
