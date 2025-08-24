
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { isTenant } from '@/lib/supabase-helpers';
import { Tenant, createTenantID } from '@/types/tenant';
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

          // Transform the data to match our Tenant interface with TenantID
          const transformedTenants = allTenants?.map(tenant => ({
            ...tenant,
            id: createTenantID(tenant.id),
            type: tenant.type as TenantType,
            status: tenant.status as TenantStatus,
            subscription_plan: tenant.subscription_plan as SubscriptionPlan,
            metadata: (tenant.metadata as Record<string, any>) || {}
          })) || [];

          return transformedTenants;
        } else {
          // Regular users can only access their assigned tenants
          // Fix the query by specifying the exact columns from tenants table
          const { data: userTenants, error: userTenantsError } = await supabase
            .from('user_tenants')
            .select(`
              tenant_id,
              tenants:tenant_id (
                id,
                name,
                slug,
                type,
                subscription_plan,
                status,
                created_at,
                updated_at,
                owner_name,
                owner_email,
                owner_phone,
                business_registration,
                business_address,
                established_date,
                subscription_start_date,
                subscription_end_date,
                trial_ends_at,
                max_farmers,
                max_dealers,
                max_products,
                max_storage_gb,
                max_api_calls_per_day,
                subdomain,
                custom_domain,
                metadata
              )
            `)
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (userTenantsError) {
            console.error('Error fetching user tenants:', userTenantsError);
            throw userTenantsError;
          }

          // Transform the data to match our Tenant interface with TenantID
          const transformedTenants = userTenants?.map(ut => {
            const tenant = ut.tenants;
            
            // Type guard to ensure tenant exists and has required properties
            if (!tenant || typeof tenant !== 'object' || !tenant.id || !tenant.name) {
              console.warn('Invalid tenant data:', tenant);
              return null;
            }
            
            // Now TypeScript knows tenant is not null and has the required properties
            const safeTenant = tenant as any; // Cast to bypass complex type checking
            
            return {
              id: createTenantID(safeTenant.id),
              name: safeTenant.name,
              slug: safeTenant.slug || '',
              type: (safeTenant.type as TenantType) || TenantType.AGRI_COMPANY,
              status: (safeTenant.status as TenantStatus) || TenantStatus.TRIAL,
              subscription_plan: (safeTenant.subscription_plan as SubscriptionPlan) || SubscriptionPlan.KISAN_BASIC,
              owner_name: safeTenant.owner_name,
              owner_email: safeTenant.owner_email,
              owner_phone: safeTenant.owner_phone,
              business_registration: safeTenant.business_registration,
              business_address: safeTenant.business_address,
              established_date: safeTenant.established_date,
              subscription_start_date: safeTenant.subscription_start_date,
              subscription_end_date: safeTenant.subscription_end_date,
              trial_ends_at: safeTenant.trial_ends_at,
              max_farmers: safeTenant.max_farmers,
              max_dealers: safeTenant.max_dealers,
              max_products: safeTenant.max_products,
              max_storage_gb: safeTenant.max_storage_gb,
              max_api_calls_per_day: safeTenant.max_api_calls_per_day,
              subdomain: safeTenant.subdomain,
              custom_domain: safeTenant.custom_domain,
              metadata: (safeTenant.metadata as Record<string, any>) || {},
              created_at: safeTenant.created_at || new Date().toISOString(),
              updated_at: safeTenant.updated_at || new Date().toISOString()
            } as Tenant;
          }).filter((tenant): tenant is Tenant => tenant !== null) || [];

          return transformedTenants;
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
