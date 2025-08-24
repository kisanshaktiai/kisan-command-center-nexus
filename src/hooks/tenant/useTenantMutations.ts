
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';
import { toast } from 'sonner';

export const useTenantMutations = () => {
  const queryClient = useQueryClient();

  const createTenantMutation = useMutation({
    mutationFn: async (data: CreateTenantDTO) => {
      const result = await tenantService.createTenant(data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create tenant');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tenant: ${error.message}`);
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTenantDTO }) => {
      const result = await tenantService.updateTenant(id, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update tenant');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tenant: ${error.message}`);
    },
  });

  const suspendTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantService.suspendTenant(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to suspend tenant');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant suspended successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to suspend tenant: ${error.message}`);
    },
  });

  const reactivateTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantService.reactivateTenant(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reactivate tenant');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant reactivated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reactivate tenant: ${error.message}`);
    },
  });

  return {
    createTenantMutation,
    updateTenantMutation,
    suspendTenantMutation,
    reactivateTenantMutation,
    isSubmitting: 
      createTenantMutation.isPending ||
      updateTenantMutation.isPending ||
      suspendTenantMutation.isPending ||
      reactivateTenantMutation.isPending,
  };
};
