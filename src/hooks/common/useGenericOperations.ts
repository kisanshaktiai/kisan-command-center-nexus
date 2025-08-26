
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { genericOperationsService, ValidationResult } from '@/services/common/GenericOperationsService';
import { toast } from 'sonner';

export interface UseGenericOperationsOptions {
  tenantId?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for generic CRUD operations
 * Provides a consistent interface for common database operations
 */
export const useGenericOperations = (table: string, options?: UseGenericOperationsOptions) => {
  const queryClient = useQueryClient();

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = await genericOperationsService.create(table, data, {
        tenant_id: options?.tenantId
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      options?.onSuccess?.(data);
      toast.success(`${table} created successfully`);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
      toast.error(`Failed to create ${table}: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await genericOperationsService.update(table, id, data, {
        tenant_id: options?.tenantId
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      options?.onSuccess?.(data);
      toast.success(`${table} updated successfully`);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
      toast.error(`Failed to update ${table}: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await genericOperationsService.delete(table, id, {
        tenant_id: options?.tenantId
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success(`${table} deleted successfully`);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
      toast.error(`Failed to delete ${table}: ${error.message}`);
    },
  });

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async ({ data, rules }: { data: any; rules: string[] }) => {
      const result = await genericOperationsService.validate(table, data, rules);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data as ValidationResult;
    },
    onError: (error: Error) => {
      options?.onError?.(error);
      toast.error(`Validation failed: ${error.message}`);
    },
  });

  // List query
  const useList = (filters?: Record<string, any>, queryOptions?: any) => {
    return useQuery({
      queryKey: [table, 'list', filters],
      queryFn: async () => {
        const result = await genericOperationsService.list(table, filters, {
          tenant_id: options?.tenantId,
          ...queryOptions
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      },
      ...queryOptions,
    });
  };

  // Read single record query
  const useRead = (id: string | undefined, queryOptions?: any) => {
    return useQuery({
      queryKey: [table, 'read', id],
      queryFn: async () => {
        if (!id) throw new Error('ID is required');
        const result = await genericOperationsService.read(table, id, {
          tenant_id: options?.tenantId
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      },
      enabled: !!id,
      ...queryOptions,
    });
  };

  // Audit trail query
  const useAuditTrail = (id: string | undefined) => {
    return useQuery({
      queryKey: [table, 'audit', id],
      queryFn: async () => {
        if (!id) throw new Error('ID is required');
        const result = await genericOperationsService.getAuditTrail(table, id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      },
      enabled: !!id,
    });
  };

  return {
    // Mutations
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    validate: validateMutation,
    
    // Queries (as functions)
    useList,
    useRead,
    useAuditTrail,
    
    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isValidating: validateMutation.isPending,
  };
};
