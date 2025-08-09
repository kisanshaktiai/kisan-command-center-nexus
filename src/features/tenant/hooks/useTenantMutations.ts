
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantManagementService } from '../services/TenantManagementService';
import { tenantQueries } from '@/data/queries/tenantQueries';
import { CreateTenantDTO, UpdateTenantDTO } from '@/data/types/tenant';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useNotifications } from '@/hooks/useNotifications';

export const useTenantMutations = () => {
  const queryClient = useQueryClient();
  const { handleAsyncError } = useErrorHandler({ 
    component: 'TenantMutations',
    logToServer: true 
  });
  const { showSuccess } = useNotifications();

  const createTenantMutation = useMutation({
    mutationFn: async (data: CreateTenantDTO) => {
      const result = await tenantManagementService.createTenant(data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create tenant');
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      showSuccess('Tenant created successfully');
    },
    onError: (error: Error) => {
      handleAsyncError(
        async () => { throw error; },
        'create tenant',
        { fallbackMessage: 'Failed to create tenant' }
      );
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTenantDTO }) => {
      const result = await tenantManagementService.updateTenant(id, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update tenant');
      }
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      queryClient.invalidateQueries({ queryKey: tenantQueries.detail(variables.id) });
      showSuccess('Tenant updated successfully');
    },
    onError: (error: Error) => {
      handleAsyncError(
        async () => { throw error; },
        'update tenant',
        { fallbackMessage: 'Failed to update tenant' }
      );
    },
  });

  // Updated to use suspension instead of hard delete
  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantManagementService.suspendTenant(id, 'Suspended by admin');
      if (!result.success) {
        throw new Error(result.error || 'Failed to suspend tenant');
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      showSuccess('Tenant suspended successfully');
    },
    onError: (error: Error) => {
      handleAsyncError(
        async () => { throw error; },
        'suspend tenant',
        { fallbackMessage: 'Failed to suspend tenant' }
      );
    },
  });

  // New mutation for reactivation
  const reactivateTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantManagementService.reactivateTenant(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reactivate tenant');
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      showSuccess('Tenant reactivated successfully');
    },
    onError: (error: Error) => {
      handleAsyncError(
        async () => { throw error; },
        'reactivate tenant',
        { fallbackMessage: 'Failed to reactivate tenant' }
      );
    },
  });

  const isSubmitting = createTenantMutation.isPending || 
                      updateTenantMutation.isPending || 
                      deleteTenantMutation.isPending ||
                      reactivateTenantMutation.isPending;

  return {
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation, // Now handles suspension
    reactivateTenantMutation,
    isSubmitting
  };
};
