
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/services/TenantService';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';
import { toast } from 'sonner';

export const useTenants = (filters?: any) => {
  return useQuery({
    queryKey: ['tenants', filters],
    queryFn: async () => {
      const result = await tenantService.getTenants(filters);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch tenants');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTenant = (tenantId: string) => {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const result = await tenantService.getTenant(tenantId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch tenant');
    },
    enabled: !!tenantId,
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTenantDTO) => {
      const result = await tenantService.createTenant(data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to create tenant');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created successfully');
    },
    onError: (error: any) => {
      console.error('Create tenant mutation error:', error);
      toast.error(`Failed to create tenant: ${error.message}`);
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTenantDTO }) => {
      const result = await tenantService.updateTenant(id, data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to update tenant');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.id] });
      toast.success('Tenant updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update tenant: ${error.message}`);
    },
  });
};

export const useDeleteTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await tenantService.deleteTenant(id);
      if (result.success) {
        return true;
      }
      throw new Error(result.error || 'Failed to delete tenant');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete tenant: ${error.message}`);
    },
  });
};
