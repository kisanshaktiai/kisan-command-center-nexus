
import { useState } from 'react';
import { Tenant, UpdateTenantDTO } from '@/types/tenant';
import { useTenantData } from './useTenantData';
import { useTenantUI } from './useTenantUI';
import { useTenantActions } from './useTenantActions';
import { useTenantAnalytics } from './useTenantAnalytics';
import { TenantDisplayService, FormattedTenantData } from '@/services/TenantDisplayService';

interface UseTenantPageStateOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

export const useTenantPageState = (options: UseTenantPageStateOptions = {}) => {
  // Data layer
  const { data: tenants = [], isLoading, error } = useTenantData({ 
    filters: options.initialFilters 
  });
  
  // UI layer
  const uiState = useTenantUI();
  
  // Actions layer
  const actions = useTenantActions();
  
  // Analytics integration
  const { tenantMetrics, refreshMetrics } = useTenantAnalytics({ 
    tenants,
    autoRefresh: true,
    refreshInterval: 30000 
  });

  // Success state management
  const [creationSuccess, setCreationSuccess] = useState<any>(null);
  const clearCreationSuccess = () => setCreationSuccess(null);

  // Format tenants for display
  const formattedTenants: FormattedTenantData[] = TenantDisplayService.formatTenantsForDisplay(tenants);
  
  // Format details tenant for display
  const detailsFormattedData = uiState.detailsTenant 
    ? TenantDisplayService.formatTenantForDisplay(uiState.detailsTenant) 
    : null;

  // Enhanced action handlers that integrate UI state
  const handleViewDetails = (tenant: Tenant) => {
    uiState.openDetailsModal(tenant);
    refreshMetrics();
  };

  const handleEditTenant = (tenant: Tenant) => {
    uiState.openEditModal(tenant);
  };

  const handleDetailsEdit = (tenant: Tenant) => {
    uiState.handleDetailsEdit(tenant);
  };

  const handleSaveTenant = async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    console.log('useTenantPageState: Saving tenant:', id, data);
    const success = await actions.handleUpdateTenant(id, data);
    if (success) {
      uiState.closeEditModal();
      refreshMetrics();
    }
    return success;
  };

  return {
    // Data
    tenants,
    formattedTenants,
    isLoading,
    error,
    isSubmitting: actions.isSubmitting,

    // Analytics
    tenantMetrics,
    refreshMetrics,

    // Success state
    creationSuccess,
    clearCreationSuccess,

    // UI state
    ...uiState,
    detailsFormattedData,

    // Actions
    handleCreateTenant: actions.handleCreateTenant,
    handleViewDetails,
    handleDetailsEdit,
    handleEditTenant,
    handleSaveTenant,
  };
};
