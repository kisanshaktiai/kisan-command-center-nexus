
import { useCallback } from 'react';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';
import { useTenantData } from './useTenantData';
import { useTenantMutations } from './useTenantMutations';
import { useTenantFiltering } from './useTenantFiltering';

interface UseTenantManagementOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
  initialViewPreferences?: TenantViewPreferences;
}

export const useTenantManagement = (options: UseTenantManagementOptions = {}) => {
  // Data and mutations
  const { data: tenants = [], isLoading, error } = useTenantData({ filters: options.initialFilters });
  const { createTenantMutation, updateTenantMutation, deleteTenantMutation, isSubmitting } = useTenantMutations();
  
  // Filtering and sorting
  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    viewPreferences,
    setViewPreferences,
    filteredTenants,
  } = useTenantFiltering({ 
    tenants, 
    initialFilters: options.initialFilters,
    initialViewPreferences: options.initialViewPreferences
  });

  // Mock data for missing properties (to be replaced with actual implementations)
  const formattedTenants = filteredTenants;
  const creationSuccess = null;
  const clearCreationSuccess = () => {};
  const detailsTenant = null;
  const isDetailsModalOpen = false;
  const detailsFormattedData = null;

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

  const handleViewDetails = useCallback((tenant: any) => {
    console.log('View details for tenant:', tenant);
  }, []);

  const handleDetailsEdit = useCallback(() => {
    console.log('Edit tenant details');
  }, []);

  const closeDetailsModal = useCallback(() => {
    console.log('Close details modal');
  }, []);

  return {
    // Data
    tenants: filteredTenants,
    formattedTenants,
    isLoading,
    error,
    isSubmitting,

    // Success state
    creationSuccess,
    clearCreationSuccess,

    // Details modal
    detailsTenant,
    isDetailsModalOpen,
    detailsFormattedData,

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
    handleViewDetails,
    handleDetailsEdit,
    closeDetailsModal,

    // Mutations for direct access if needed
    createTenantMutation,
    updateTenantMutation,
    deleteTenantMutation,
  };
};
