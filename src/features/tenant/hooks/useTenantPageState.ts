
import { useState } from 'react';
import { TenantViewPreferences } from '@/types/tenantView';
import { useTenantData } from './useTenantData';
import { useTenantActions } from './useTenantActions';
import { useTenantModals } from './useTenantModals';
import { useTenantAnalytics } from './useTenantAnalytics';
import { TenantDisplayService } from '@/services/TenantDisplayService';
import { Tenant, UpdateTenantDTO } from '@/types/tenant';

interface UseTenantPageStateOptions {
  initialFilters?: {
    search?: string;
    type?: string;
    status?: string;
  };
}

interface CreationSuccessState {
  tenantName: string;
  adminEmail: string;
  hasEmailSent: boolean;
}

export const useTenantPageState = (options: UseTenantPageStateOptions = {}) => {
  const { data: tenantData = [], isLoading, error } = useTenantData({ filters: options.initialFilters });
  
  // Ensure we always work with an array
  const tenants = Array.isArray(tenantData) ? tenantData : (tenantData ? [tenantData] : []) as Tenant[];
  
  // Use focused hooks
  const { handleCreateTenant, handleUpdateTenant, isSubmitting } = useTenantActions();
  const {
    detailsTenant,
    isDetailsModalOpen,
    handleViewDetails,
    closeDetailsModal,
    handleDetailsEdit,
    editingTenant,
    isEditModalOpen,
    handleEditTenant,
    closeEditModal,
  } = useTenantModals();
  
  // Analytics integration
  const { refreshMetrics } = useTenantAnalytics({ 
    tenants,
    autoRefresh: true,
    refreshInterval: 30000 
  });
  
  // Local state
  const [creationSuccess, setCreationSuccess] = useState<CreationSuccessState | null>(null);
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
  const formattedTenants = TenantDisplayService.formatTenantsForDisplay(tenants);
  
  // Success state management
  const clearCreationSuccess = () => {
    setCreationSuccess(null);
  };

  // Enhanced create handler
  const handleCreateTenantWithSuccess = async (data: any): Promise<boolean> => {
    const success = await handleCreateTenant(data);
    if (success) {
      setCreationSuccess({
        tenantName: data.name,
        adminEmail: data.owner_email || '',
        hasEmailSent: true
      });
      refreshMetrics();
    }
    return success;
  };

  // Enhanced save handler
  const handleSaveTenant = async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    const success = await handleUpdateTenant(id, data);
    if (success) {
      closeEditModal();
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
    isSubmitting,

    // Success state
    creationSuccess,
    clearCreationSuccess,

    // Details modal
    detailsTenant,
    isDetailsModalOpen,

    // Edit modal
    editingTenant,
    isEditModalOpen,

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
    handleCreateTenant: handleCreateTenantWithSuccess,
    handleViewDetails,
    handleDetailsEdit,
    handleEditTenant,
    handleSaveTenant,
    closeDetailsModal,
    closeEditModal,
  };
};
