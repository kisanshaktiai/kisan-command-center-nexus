
import { useCallback } from 'react';
import { useTenantMutations } from '@/features/tenant/hooks/useTenantMutations';
import { CreateTenantDTO, UpdateTenantDTO, Tenant } from '@/types/tenant';

/**
 * Focused hook for tenant actions
 * Handles: Create, Update, Delete operations
 */
export const useTenantActions = () => {
  const { 
    createTenantMutation, 
    updateTenantMutation, 
    deleteTenantMutation,
    reactivateTenantMutation,
    isSubmitting 
  } = useTenantMutations();

  const createTenant = useCallback(async (data: CreateTenantDTO): Promise<boolean> => {
    try {
      const result = await createTenantMutation.mutateAsync(data);
      return !!result;
    } catch {
      return false;
    }
  }, [createTenantMutation]);

  const updateTenant = useCallback(async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      await updateTenantMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  }, [updateTenantMutation]);

  const deleteTenant = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteTenantMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteTenantMutation]);

  const reactivateTenant = useCallback(async (id: string): Promise<boolean> => {
    try {
      await reactivateTenantMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [reactivateTenantMutation]);

  return {
    // Actions
    createTenant,
    updateTenant,
    deleteTenant,
    reactivateTenant,
    
    // State
    isSubmitting,
    
    // Direct mutation access if needed
    mutations: {
      createTenantMutation,
      updateTenantMutation,
      deleteTenantMutation,
      reactivateTenantMutation,
    },
  };
};
