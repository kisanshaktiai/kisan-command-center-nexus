
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

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantManagementService.deleteTenant(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete tenant');
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      showSuccess('Tenant deleted successfully');
    },
    onError: (error: Error) => {
      handleAsyncError(
        async () => { throw error; },
        'delete tenant',
        { fallbackMessage: 'Failed to delete tenant' }
      );
    },
  });

  const isSubmitting = createTenantMutation.isPending || 
                      updateTenantMutation.isPending || 
                      deleteTenantMutation.isPending;

  return {
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation,
    isSubmitting
  };
};
