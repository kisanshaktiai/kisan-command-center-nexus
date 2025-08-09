
import { useState } from 'react';
import { TenantViewPreferences } from '@/types/tenantView';
import { useTenantData } from './useTenantData';
import { useTenantManagement } from './useTenantManagement';
import { TenantDisplayService, FormattedTenantData } from '@/services/TenantDisplayService';

interface UseTenantPageStateOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

export const useTenantPageState = (options: UseTenantPageStateOptions = {}) => {
  const { data: tenants = [], isLoading, error } = useTenantData({ filters: options.initialFilters });
  
  const {
    // Core management functionality
    isSubmitting,
    creationSuccess,
    clearCreationSuccess,
    
    // Modal state
    detailsTenant,
    isDetailsModalOpen,
    
    // Actions
    handleCreateTenant,
    handleDeleteTenant,
    handleViewDetails,
    handleDetailsEdit,
    closeDetailsModal,
  } = useTenantManagement();
  
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [searchTerm, setSearchTerm] = useState(options.initialFilters?.search || '');
  const [filterType, setFilterType] = useState(options.initialFilters?.type || '');
  const [filterStatus, setFilterStatus] = useState(options.initialFilters?.status || '');

  // Format tenants for display
  const formattedTenants: FormattedTenantData[] = TenantDisplayService.formatTenantsForDisplay(tenants);
  
  // Format details tenant for display
  const detailsFormattedData = detailsTenant ? TenantDisplayService.formatTenantForDisplay(detailsTenant) : null;

  return {
    // Data
    tenants,
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

    // View preferences
    viewPreferences,
    setViewPreferences,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,

    // Actions
    handleCreateTenant,
    handleDeleteTenant,
    handleViewDetails,
    handleDetailsEdit,
    closeDetailsModal,
  };
};
