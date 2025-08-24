
import { useTenantData } from './useTenantData';
import { useTenantMutations } from './useTenantMutations';
import { useTenantFilters } from './useTenantFilters';
import { useTenantModals } from './useTenantModals';
import { CreateTenantDTO, UpdateTenantDTO, Tenant } from '@/types/tenant';

interface UseTenantManagementOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

export const useTenantManagement = (options: UseTenantManagementOptions = {}) => {
  // Data layer
  const { data: tenants = [], isLoading, error } = useTenantData({
    filters: options.initialFilters
  });

  // Mutations
  const {
    createTenantMutation,
    updateTenantMutation,
    suspendTenantMutation,
    reactivateTenantMutation,
    isSubmitting
  } = useTenantMutations();

  // Filtering and UI state
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
    clearFilters,
  } = useTenantFilters({
    tenants,
    initialSearch: options.initialFilters?.search,
    initialType: options.initialFilters?.type,
    initialStatus: options.initialFilters?.status,
  });

  // Modal management
  const {
    selectedTenant,
    isDetailsModalOpen,
    isEditModalOpen,
    creationSuccess,
    openDetailsModal,
    closeDetailsModal,
    openEditModal,
    closeEditModal,
    handleDetailsEdit,
    setCreationSuccess,
    clearCreationSuccess,
  } = useTenantModals();

  // Action handlers
  const handleCreateTenant = async (data: CreateTenantDTO): Promise<boolean> => {
    try {
      const result = await createTenantMutation.mutateAsync(data);
      if (result) {
        setCreationSuccess({
          tenantName: data.name,
          adminEmail: data.owner_email || '',
          hasEmailSent: true,
          correlationId: `create-${Date.now()}`
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleUpdateTenant = async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      await updateTenantMutation.mutateAsync({ id, data });
      closeEditModal();
      return true;
    } catch {
      return false;
    }
  };

  const handleSuspendTenant = async (id: string): Promise<boolean> => {
    try {
      await suspendTenantMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const handleReactivateTenant = async (id: string): Promise<boolean> => {
    try {
      await reactivateTenantMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    // Data
    tenants: filteredTenants,
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
    viewPreferences,
    setViewPreferences,
    clearFilters,

    // Modals
    selectedTenant,
    isDetailsModalOpen,
    isEditModalOpen,
    creationSuccess,
    openDetailsModal,
    closeDetailsModal,
    openEditModal,
    closeEditModal,
    handleDetailsEdit,
    clearCreationSuccess,

    // Actions
    handleCreateTenant,
    handleUpdateTenant,
    handleSuspendTenant,
    handleReactivateTenant,
  };
};
