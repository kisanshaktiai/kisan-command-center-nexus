
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantManagementService } from '../services/TenantManagementService';
import { tenantQueries } from '@/data/queries/tenantQueries';
import { CreateTenantDTO, UpdateTenantDTO } from '@/data/types/tenant';
import { toast } from 'sonner';

export const useTenantMutations = () => {
  const queryClient = useQueryClient();

  const createTenantMutation = useMutation({
    mutationFn: async (data: CreateTenantDTO) => {
      const result = await tenantManagementService.createTenant(data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      toast.success('Tenant created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tenant: ${error.message}`);
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTenantDTO }) => {
      const result = await tenantManagementService.updateTenant(id, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      queryClient.invalidateQueries({ queryKey: tenantQueries.detail(variables.id) });
      toast.success('Tenant updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tenant: ${error.message}`);
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantManagementService.deleteTenant(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      toast.success('Tenant deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete tenant: ${error.message}`);
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
