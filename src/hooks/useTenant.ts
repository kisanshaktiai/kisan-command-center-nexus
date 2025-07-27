
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { isTenant } from '@/lib/supabase-helpers';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
  subscription_plan: 'starter' | 'growth' | 'enterprise' | 'custom';
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
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No authenticated user found');
          return [];
        }

        // Check if user is an admin first
        const { data: isAdmin, error: adminError } = await supabase
          .rpc('is_current_user_super_admin');

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

          return allTenants || [];
        } else {
          // Regular users can only access their assigned tenants
          const { data: userTenants, error: userTenantsError } = await supabase
            .from('user_tenants')
            .select(`
              tenant_id,
              tenants (
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

          if (userTenantsError) {
            console.error('Error fetching user tenants:', userTenantsError);
            throw userTenantsError;
          }

          return userTenants?.map(ut => ut.tenants).filter(Boolean) || [];
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
