
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/services/TenantService';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';
import { toast } from 'sonner';

export const useTenantMutations = () => {
  const queryClient = useQueryClient();

  const createTenantMutation = useMutation({
    mutationFn: async (data: CreateTenantDTO) => {
      const result = await tenantService.createTenant(data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to create tenant');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-data'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created successfully');
    },
    onError: (error: any) => {
      console.error('Create tenant mutation error:', error);
      toast.error(`Failed to create tenant: ${error.message}`);
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTenantDTO }) => {
      const result = await tenantService.updateTenant(id, data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to update tenant');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-data'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.id] });
      toast.success('Tenant updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update tenant: ${error.message}`);
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantService.deleteTenant(id);
      if (result.success) {
        return true;
      }
      throw new Error(result.error || 'Failed to delete tenant');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-data'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete tenant: ${error.message}`);
    },
  });

  return {
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation,
    isSubmitting: createTenantMutation.isPending || 
                   updateTenantMutation.isPending || 
                   deleteTenantMutation.isPending,
  };
};
