
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Tenant } from '@/types/tenant';

interface TenantAuthState {
  userTenants: Tenant[];
  currentTenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: (tenantId: string, permission: string) => boolean;
  isTenantAdmin: (tenantId: string) => boolean;
  isSuperAdmin: boolean;
  refreshTenantAccess: () => Promise<void>;
}

interface TenantAuthContextType extends TenantAuthState {
  setCurrentTenant: (tenant: Tenant | null) => void;
}

const TenantAuthContext = createContext<TenantAuthContextType | null>(null);

interface TenantAuthProviderProps {
  children: ReactNode;
}

export const TenantAuthProvider: React.FC<TenantAuthProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [userTenants, setUserTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const refreshTenantAccess = async () => {
    if (!user || !isAuthenticated) {
      setUserTenants([]);
      setCurrentTenant(null);
      setIsSuperAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if user is super admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

      const isAdmin = !adminError && adminUser?.role === 'super_admin';
      setIsSuperAdmin(isAdmin);

      if (isAdmin) {
        // Super admins can access all tenants
        const { data: allTenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false });

        if (tenantsError) throw tenantsError;
        setUserTenants(allTenants || []);
      } else {
        // Regular users - get their assigned tenants
        const { data: userTenantRelations, error: relationsError } = await supabase
          .from('user_tenants')
          .select(`
            role,
            is_active,
            tenants (*)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (relationsError) throw relationsError;

        const tenants = userTenantRelations
          ?.map(relation => relation.tenants)
          .filter(Boolean) || [];
        
        setUserTenants(tenants);
      }

      // Set current tenant if none selected
      if (!currentTenant && userTenants.length > 0) {
        setCurrentTenant(userTenants[0]);
      }
    } catch (err) {
      console.error('Error refreshing tenant access:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant access');
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (tenantId: string, permission: string): boolean => {
    if (isSuperAdmin) return true;
    
    // Check if user has access to this tenant
    const hasAccess = userTenants.some(tenant => tenant.id === tenantId);
    return hasAccess;
  };

  const isTenantAdmin = (tenantId: string): boolean => {
    if (isSuperAdmin) return true;
    
    // For now, any user with tenant access is considered admin
    // This can be enhanced to check specific roles
    return hasPermission(tenantId, 'admin');
  };

  useEffect(() => {
    refreshTenantAccess();
  }, [user, isAuthenticated]);

  const contextValue: TenantAuthContextType = {
    userTenants,
    currentTenant,
    isLoading,
    error,
    isSuperAdmin,
    hasPermission,
    isTenantAdmin,
    refreshTenantAccess,
    setCurrentTenant,
  };

  return (
    <TenantAuthContext.Provider value={contextValue}>
      {children}
    </TenantAuthContext.Provider>
  );
};

export const useTenantAuth = (): TenantAuthContextType => {
  const context = useContext(TenantAuthContext);
  if (!context) {
    throw new Error('useTenantAuth must be used within a TenantAuthProvider');
  }
  return context;
};
