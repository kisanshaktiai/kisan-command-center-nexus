
import { useCallback } from 'react';
import { useTenantMutations } from './useTenantMutations';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';

interface CreationSuccessState {
  tenantName: string;
  adminEmail: string;
  hasEmailSent: boolean;
  correlationId?: string;
  warnings?: string[];
}

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
      const result = await createTenantMutation.mutateAsync(data);
      return !!result;
    } catch {
      return false;
    }
  }, [createTenantMutation]);

  const handleUpdateTenant = useCallback(async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      await updateTenantMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  }, [updateTenantMutation]);

  const handleDeleteTenant = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteTenantMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteTenantMutation]);

  const handleReactivateTenant = useCallback(async (id: string): Promise<boolean> => {
    try {
      await reactivateTenantMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [reactivateTenantMutation]);

  return {
    // Core actions
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
    handleReactivateTenant,
    
    // Loading state
    isSubmitting,

    // Direct access to mutations if needed
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation,
    reactivateTenantMutation,
  };
};
