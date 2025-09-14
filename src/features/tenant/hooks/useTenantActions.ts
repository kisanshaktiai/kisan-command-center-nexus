
import { useCallback } from 'react';
import { useTenantMutations } from './useTenantMutations';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';

export const useTenantActions = () => {
  const { 
    createTenantMutation, 
    updateTenantMutation, 
    deleteTenantMutation,
    reactivateTenantMutation,
    isSubmitting 
  } = useTenantMutations();

  const handleCreateTenant = useCallback(async (data: CreateTenantDTO): Promise<boolean> => {
    try {
      console.log('useTenantActions: Creating tenant with data:', data);
      const result = await createTenantMutation.mutateAsync(data);
      console.log('useTenantActions: Tenant creation result:', result);
      return !!result.success;
    } catch (error) {
      console.error('useTenantActions: Failed to create tenant:', error);
      return false;
    }
  }, [createTenantMutation]);

  const handleUpdateTenant = useCallback(async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      console.log('useTenantActions: Updating tenant:', id, data);
      await updateTenantMutation.mutateAsync({ id, data });
      return true;
    } catch (error) {
      console.error('useTenantActions: Failed to update tenant:', error);
      return false;
    }
  }, [updateTenantMutation]);

  const handleDeleteTenant = useCallback(async (id: string): Promise<boolean> => {
    try {
      console.log('useTenantActions: Deleting tenant:', id);
      await deleteTenantMutation.mutateAsync(id);
      return true;
    } catch (error) {
      console.error('useTenantActions: Failed to delete tenant:', error);
      return false;
    }
  }, [deleteTenantMutation]);

  const handleReactivateTenant = useCallback(async (id: string): Promise<boolean> => {
    try {
      console.log('useTenantActions: Reactivating tenant:', id);
      await reactivateTenantMutation.mutateAsync(id);
      return true;
    } catch (error) {
      console.error('useTenantActions: Failed to reactivate tenant:', error);
      return false;
    }
  }, [reactivateTenantMutation]);

  return {
    // Actions
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
    handleReactivateTenant,
    
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
