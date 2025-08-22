
import { useCallback } from 'react';
import { Tenant, UpdateTenantDTO, CreateTenantDTO } from '@/types/tenant';
import { useTenantMutations } from './useTenantMutations';

interface CreationSuccessState {
  tenantName: string;
  adminEmail: string;
  hasEmailSent: boolean;
}

export const useTenantActions = () => {
  const { createTenantMutation, updateTenantMutation, isSubmitting } = useTenantMutations();

  const handleCreateTenant = useCallback(async (data: CreateTenantDTO): Promise<boolean> => {
    try {
      await createTenantMutation.mutateAsync(data);
      return true;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      return false;
    }
  }, [createTenantMutation]);

  const handleUpdateTenant = useCallback(async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      await updateTenantMutation.mutateAsync({ id, data });
      return true;
    } catch (error) {
      console.error('Failed to update tenant:', error);
      return false;
    }
  }, [updateTenantMutation]);

  return {
    handleCreateTenant,
    handleUpdateTenant,
    isSubmitting
  };
};
