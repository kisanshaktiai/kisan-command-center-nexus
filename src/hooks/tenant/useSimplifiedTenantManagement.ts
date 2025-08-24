
import { useTenantUIState } from '@/hooks/ui/useTenantUIState';
import { useTenantDataLayer } from './useTenantDataLayer';
import { useTenantActions } from './useTenantActions';
import { useTenantModals } from './useTenantModals';
import { Tenant, UpdateTenantDTO } from '@/types/tenant';

interface UseSimplifiedTenantManagementOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

/**
 * Simplified tenant management hook
 * Composes focused hooks without circular dependencies
 */
export const useSimplifiedTenantManagement = (
  options: UseSimplifiedTenantManagementOptions = {}
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

  // Enhanced action handlers
  const handleViewDetails = (tenant: Tenant) => {
    modals.openDetailsModal(tenant);
  };

  const handleEditTenant = (tenant: Tenant) => {
    modals.openEditModal(tenant);
  };

  const handleDetailsEdit = (tenant: Tenant) => {
    modals.handleDetailsEdit(tenant);
  };

  const handleSaveTenant = async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
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

    // UI State
    ...uiState,

    // Modal state
    ...modals,

    // Actions
    createTenant: actions.createTenant,
    handleViewDetails,
    handleEditTenant,
    handleDetailsEdit,
    handleSaveTenant,
    isSubmitting: actions.isSubmitting,
  };
};
