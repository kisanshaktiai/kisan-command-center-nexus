
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantManagementService } from '../services/TenantManagementService';
import { tenantQueries } from '@/data/queries/tenantQueries';
import { CreateTenantDTO, UpdateTenantDTO, TenantDTO } from '@/data/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';
import { toast } from 'sonner';

interface UseTenantManagementOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
  initialViewPreferences?: TenantViewPreferences;
}

export const useTenantManagement = (options: UseTenantManagementOptions = {}) => {
  const queryClient = useQueryClient();
  
  // State
  const [searchTerm, setSearchTerm] = useState(options.initialFilters?.search || '');
  const [filterType, setFilterType] = useState(options.initialFilters?.type || 'all');
  const [filterStatus, setFilterStatus] = useState(options.initialFilters?.status || 'all');
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>(
    options.initialViewPreferences || {
      mode: 'small-cards',
      density: 'comfortable',
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
  );

  // Memoized filters
  const filters = useMemo(() => ({
    searchTerm,
    filterType,
    filterStatus
  }), [searchTerm, filterType, filterStatus]);

  // Queries
  const {
    data: tenants = [],
    isLoading,
    error
  } = useQuery({
    queryKey: tenantQueries.list(filters),
    queryFn: async () => {
      const result = await tenantManagementService.getAllTenants(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
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

  // Filter and sort tenants
  const filteredAndSortedTenants = useMemo(() => {
    let filtered = tenants.filter((tenant: any) => {
      const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || tenant.type === filterType;
      const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });

    // Sort
    const { sortBy, sortOrder } = viewPreferences;
    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortBy as keyof TenantDTO] as string;
      let bValue = b[sortBy as keyof TenantDTO] as string;
      
      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime().toString();
        bValue = new Date(bValue).getTime().toString();
      }
      
      const comparison = aValue?.localeCompare(bValue) || 0;
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [tenants, searchTerm, filterType, filterStatus, viewPreferences]);

  // Action handlers
  const handleCreateTenant = useCallback(async (data: CreateTenantDTO): Promise<boolean> => {
    try {
      await createTenantMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  }, [createTenantMutation]);

  const handleUpdateTenant = useCallback(async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      await updateTenantMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  }, [updateTenantMutation]);

  const handleDeleteTenant = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteTenantMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteTenantMutation]);

  const isSubmitting = createTenantMutation.isPending || 
                      updateTenantMutation.isPending || 
                      deleteTenantMutation.isPending;

  return {
    // Data
    tenants: filteredAndSortedTenants,
    isLoading,
    error,
    isSubmitting,

    // Filters
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,

    // View preferences
    viewPreferences,
    setViewPreferences,

    // Actions
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,

    // Mutations for direct access if needed
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation,
  };
};
