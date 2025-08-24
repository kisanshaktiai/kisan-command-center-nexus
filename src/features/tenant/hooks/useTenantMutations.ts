
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantManagementService } from '../services/TenantManagementService';
import { CreateTenantDTO, UpdateTenantDTO, Tenant } from '@/types/tenant';
import { toast } from 'sonner';

export const useTenantMutations = () => {
  const queryClient = useQueryClient();

  const createTenantMutation = useMutation({
    mutationFn: (data: CreateTenantDTO) => tenantManagementService.createTenant(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        toast.success('Tenant created successfully');
      } else {
        toast.error(result.error || 'Failed to create tenant');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create tenant');
    }
  });

  const updateTenantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantDTO }) => 
      tenantManagementService.updateTenant(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        toast.success('Tenant updated successfully');
      } else {
        toast.error(result.error || 'Failed to update tenant');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update tenant');
    }
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (id: string) => tenantManagementService.deleteTenant(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        toast.success('Tenant deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete tenant');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete tenant');
    }
  });

  const reactivateTenantMutation = useMutation({
    mutationFn: (id: string) => tenantManagementService.reactivateTenant(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        toast.success('Tenant reactivated successfully');
      } else {
        toast.error(result.error || 'Failed to reactivate tenant');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reactivate tenant');
    }
  });

  const isSubmitting = 
    createTenantMutation.isPending || 
    updateTenantMutation.isPending || 
    deleteTenantMutation.isPending || 
    reactivateTenantMutation.isPending;

  return {
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation,
    reactivateTenantMutation,
    isSubmitting
  };
};
