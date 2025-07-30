
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/domain/tenants/tenantService';
import { toast } from 'sonner';

export const useTenants = (filters?: any) => {
  return useQuery({
    queryKey: ['tenants', filters],
    queryFn: () => tenantService.getTenants(filters),
  });
};

export const useTenant = (tenantId: string) => {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => tenantService.getTenant(tenantId),
    enabled: !!tenantId,
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: tenantService.createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create tenant: ${error.message}`);
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      tenantService.updateTenant(id, data),
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
