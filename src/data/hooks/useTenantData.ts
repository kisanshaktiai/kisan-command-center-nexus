
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantRepository } from '@/data/repositories/TenantRepository';
import { tenantQueries } from '@/data/queries/tenantQueries';
import { CreateTenantDTO, UpdateTenantDTO } from '@/data/types/tenant';
import { unifiedErrorService } from '@/services/core/UnifiedErrorService';
import { toast } from 'sonner';

export const useTenants = (filters?: any) => {
  return useQuery({
    queryKey: tenantQueries.list(filters),
    queryFn: () => tenantRepository.getTenants(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      const errorResult = unifiedErrorService.handleApiError(error, 'getTenants', 'fetch tenants');
      if (errorResult.shouldShowNotification) {
        toast.error(errorResult.userMessage);
      }
      return failureCount < 2;
    }
  });
};

export const useTenant = (tenantId: string) => {
  return useQuery({
    queryKey: tenantQueries.detail(tenantId),
    queryFn: () => tenantRepository.getTenant(tenantId),
    enabled: !!tenantId,
    retry: (failureCount, error) => {
      const errorResult = unifiedErrorService.handleApiError(error, 'getTenant', 'fetch tenant details');
      if (errorResult.shouldShowNotification) {
        toast.error(errorResult.userMessage);
      }
      return failureCount < 2;
    }
  });
};

export const useCreateTenantMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateTenantDTO) => tenantRepository.createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      toast.success('Tenant created successfully');
    },
    onError: (error) => {
      const errorResult = unifiedErrorService.handleApiError(error, 'createTenant', 'create tenant');
      if (errorResult.shouldShowNotification) {
        toast.error(errorResult.userMessage);
      }
    }
  });
};

export const useUpdateTenantMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantDTO }) => 
      tenantRepository.updateTenant(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      queryClient.invalidateQueries({ queryKey: tenantQueries.detail(variables.id) });
      toast.success('Tenant updated successfully');
    },
    onError: (error) => {
      const errorResult = unifiedErrorService.handleApiError(error, 'updateTenant', 'update tenant');
      if (errorResult.shouldShowNotification) {
        toast.error(errorResult.userMessage);
      }
    }
  });
};

export const useDeleteTenantMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tenantId: string) => tenantRepository.deleteTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantQueries.all });
      toast.success('Tenant deleted successfully');
    },
    onError: (error) => {
      const errorResult = unifiedErrorService.handleApiError(error, 'deleteTenant', 'delete tenant');
      if (errorResult.shouldShowNotification) {
        toast.error(errorResult.userMessage);
      }
    }
  });
};
