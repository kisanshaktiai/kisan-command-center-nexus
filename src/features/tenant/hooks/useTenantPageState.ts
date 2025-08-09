
import { useState } from 'react';
import { TenantViewPreferences } from '@/types/tenantView';
import { useTenantData } from './useTenantData';
import { useTenantManagement } from './useTenantManagement';
import { useTenantAnalytics } from './useTenantAnalytics';
import { TenantDisplayService, FormattedTenantData } from '@/services/TenantDisplayService';
import { Tenant } from '@/types/tenant';

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
    
    // Actions
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
  } = useTenantManagement();
  
  // Analytics integration
  const { tenantMetrics, refreshMetrics } = useTenantAnalytics({ 
    tenants,
    autoRefresh: true,
    refreshInterval: 30000 
  });
  
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [searchTerm, setSearchTerm] = useState(options.initialFilters?.search || '');
  const [filterType, setFilterType] = useState(options.initialFilters?.type || '');
  const [filterStatus, setFilterStatus] = useState(options.initialFilters?.status || '');

  // Modal states - moved here for better control
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Format tenants for display
  const formattedTenants: FormattedTenantData[] = TenantDisplayService.formatTenantsForDisplay(tenants);
  
  // Format details tenant for display
  const detailsFormattedData = detailsTenant ? TenantDisplayService.formatTenantForDisplay(detailsTenant) : null;

  // Enhanced action handlers
  const handleViewDetails = (tenant: Tenant) => {
    console.log('useTenantPageState: Opening details for tenant:', tenant.id);
    setDetailsTenant(tenant);
    setIsDetailsModalOpen(true);
    // Refresh metrics for the selected tenant
    refreshMetrics();
  };

  const handleDetailsEdit = (tenant: Tenant) => {
    console.log('useTenantPageState: Edit from details for tenant:', tenant.id);
    // Close details modal and open edit modal
    setIsDetailsModalOpen(false);
    setDetailsTenant(null);
    setEditingTenant(tenant);
    setIsEditModalOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    console.log('useTenantPageState: Direct edit for tenant:', tenant.id);
    setEditingTenant(tenant);
    setIsEditModalOpen(true);
  };

  const closeDetailsModal = () => {
    console.log('useTenantPageState: Closing details modal');
    setIsDetailsModalOpen(false);
    setDetailsTenant(null);
  };

  const closeEditModal = () => {
    console.log('useTenantPageState: Closing edit modal');
    setIsEditModalOpen(false);
    setEditingTenant(null);
  };

  const handleSaveTenant = async (id: string, data: any): Promise<boolean> => {
    console.log('useTenantPageState: Saving tenant:', id, data);
    const success = await handleUpdateTenant(id, data);
    if (success) {
      closeEditModal();
      // Refresh metrics after update
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

    // Analytics
    tenantMetrics,
    refreshMetrics,

    // Success state
    creationSuccess,
    clearCreationSuccess,

    // Details modal
    detailsTenant,
    isDetailsModalOpen,
    detailsFormattedData,

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
    handleCreateTenant,
    handleViewDetails,
    handleDetailsEdit,
    handleEditTenant,
    handleSaveTenant,
    closeDetailsModal,
    closeEditModal,
  };
};
