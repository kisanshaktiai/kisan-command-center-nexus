
import { useTenantUIState } from '@/hooks/ui/useTenantUIState';
import { useTenantDataLayer } from './useTenantDataLayer';
import { useTenantActions } from './useTenantActions';
import { useTenantModals } from './useTenantModals';
import { Tenant, UpdateTenantDTO } from '@/types/tenant';

interface UseStandardizedTenantManagementOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

/**
 * Standardized tenant management hook with consistent naming
 * Designed for easy testing and clear separation of concerns
 */
export const useStandardizedTenantManagement = (
  options: UseStandardizedTenantManagementOptions = {}
) => {
  // UI state management
  const uiState = useTenantUIState();

  // Data layer
  const dataLayer = useTenantDataLayer({
    searchTerm: uiState.searchTerm,
    filterType: uiState.filterType,
    filterStatus: uiState.filterStatus,
    viewPreferences: uiState.viewPreferences,
    initialFilters: options.initialFilters,
  });

  // Actions
  const actions = useTenantActions();

  // Modal management
  const modals = useTenantModals();

  // Enhanced action handlers with consistent naming
  const viewTenantDetails = (tenant: Tenant) => {
    modals.openDetailsModal(tenant);
  };

  const editTenant = (tenant: Tenant) => {
    modals.openEditModal(tenant);
  };

  const editTenantFromDetails = (tenant: Tenant) => {
    modals.handleDetailsEdit(tenant);
  };

  const saveTenantChanges = async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    const success = await actions.updateTenant(id, data);
    if (success) {
      modals.closeEditModal();
    }
    return success;
  };

  return {
    // Data
    tenants: dataLayer.processedTenants,
    formattedTenants: dataLayer.formattedTenants,
    isLoading: dataLayer.isLoading,
    error: dataLayer.error,
    totalCount: dataLayer.totalCount,
    filteredCount: dataLayer.filteredCount,

    // UI State (with consistent naming)
    searchTerm: uiState.searchTerm,
    setSearchTerm: uiState.setSearchTerm,
    filterType: uiState.filterType,
    setFilterType: uiState.setFilterType,
    filterStatus: uiState.filterStatus,
    setFilterStatus: uiState.setFilterStatus,
    viewPreferences: uiState.viewPreferences,
    setViewPreferences: uiState.setViewPreferences,
    clearFilters: uiState.clearFilters,

    // Modal state (with consistent naming)
    selectedTenant: modals.selectedTenant,
    isDetailsModalOpen: modals.isDetailsModalOpen,
    isEditModalOpen: modals.isEditModalOpen,
    creationSuccess: modals.creationSuccess,
    detailsFormattedData: modals.detailsFormattedData,

    // Actions (with consistent naming)
    createTenant: actions.createTenant,
    viewTenantDetails,
    editTenant,
    editTenantFromDetails,
    saveTenantChanges,
    isSubmitting: actions.isSubmitting,

    // Modal actions (with consistent naming)
    openDetailsModal: modals.openDetailsModal,
    closeDetailsModal: modals.closeDetailsModal,
    openEditModal: modals.openEditModal,
    closeEditModal: modals.closeEditModal,
    setCreationSuccess: modals.setCreationSuccess,
    clearCreationSuccess: modals.clearCreationSuccess,
  };
};
