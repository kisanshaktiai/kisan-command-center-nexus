
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { isTenant } from '@/lib/supabase-helpers';
import { Tenant, createTenantID, convertDatabaseTenant } from '@/types/tenant';
import { SubscriptionPlan, TenantType, TenantStatus } from '@/types/enums';

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
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No authenticated user found');
          return [];
        }

        // Check if user is an admin first using the new RPC function
        const { data: isAdmin, error: adminError } = await supabase
          .rpc('is_current_user_super_admin' as any);

        if (adminError) {
          console.error('Error checking admin status:', adminError);
          throw new Error('Failed to verify user permissions');
        }

        if (isAdmin) {
          // Super admins can access all tenants
          const { data: allTenants, error: tenantsError } = await supabase
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

          if (tenantsError) {
            console.error('Error fetching tenants for admin:', tenantsError);
            throw tenantsError;
          }

          // Transform the data using convertDatabaseTenant
          const transformedTenants = allTenants?.map(convertDatabaseTenant) || [];
          return transformedTenants;
        } else {
          // Regular users can only access their assigned tenants
          const { data: userTenants, error: userTenantsError } = await supabase
            .from('user_tenants')
            .select(`
              tenant_id,
              tenants!user_tenants_tenant_id_fkey (*)
            `)
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (userTenantsError) {
            console.error('Error fetching user tenants:', userTenantsError);
            throw userTenantsError;
          }

          // Transform the data using convertDatabaseTenant
          const transformedTenants = userTenants?.map(ut => {
            const tenant = ut.tenants;
            if (!tenant) return null;
            return convertDatabaseTenant(tenant);
          }).filter(Boolean) || [];

          return transformedTenants as Tenant[];
        }
      } catch (error) {
        console.error('Error in tenant query:', error);
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
