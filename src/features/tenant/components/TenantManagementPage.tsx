
import React, { memo, useState } from 'react';
import { TenantErrorBoundary } from './TenantErrorBoundary';
import { DataErrorBoundary } from '@/components/error-boundaries/DataErrorBoundary';
import { TenantManagementHeader } from './TenantManagementHeader';
import { TenantViewControls } from './TenantViewControls';
import { TenantViewRenderer } from './TenantViewRenderer';
import { TenantDetailsModalRefactored } from '@/components/tenant/TenantDetailsModalRefactored';
import { TenantEditModal } from '@/components/tenant/TenantEditModal';
import { TenantLoadingState } from './TenantLoadingState';
import { TenantErrorState } from './TenantErrorState';
import { TenantSuccessNotification } from './TenantSuccessNotification';
import { useTenantPageState } from '../hooks/useTenantPageState';
import { useTenantMutations } from '../hooks/useTenantMutations';
import { Tenant, UpdateTenantDTO } from '@/types/tenant';

const TenantManagementPage = memo(() => {
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const {
    // Data
    tenants,
    formattedTenants,
    isLoading,
    error,
    isSubmitting,

    // UI State
    creationSuccess,
    clearCreationSuccess,

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

    // Modal state
    detailsTenant,
    isDetailsModalOpen,
    detailsFormattedData,

    // Actions
    handleCreateTenant,
    handleViewDetails,
    handleDetailsEdit,
    closeDetailsModal,
  } = useTenantPageState();

  const { updateTenantMutation } = useTenantMutations();

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsEditModalOpen(true);
  };

  const handleSaveTenant = async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      await updateTenantMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  };

  const handleSuspendTenant = async (tenantId: string): Promise<boolean> => {
    // This will be handled by the updated service that calls suspend_tenant function
    try {
      await updateTenantMutation.mutateAsync({ 
        id: tenantId, 
        data: { 
          status: 'suspended',
          metadata: {
            suspended_at: new Date().toISOString(),
            suspension_reason: 'Manual suspension by admin'
          }
        }
      });
      return true;
    } catch {
      return false;
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTenant(null);
  };

  if (isLoading) {
    return <TenantLoadingState />;
  }

  return (
    <TenantErrorBoundary>
      <div className="space-y-6">
        {/* Success Notification */}
        <TenantSuccessNotification 
          creationSuccess={creationSuccess}
          onClose={clearCreationSuccess}
        />

        {/* Header */}
        <TenantManagementHeader 
          onCreateTenant={handleCreateTenant}
          isSubmitting={isSubmitting}
        />

        {/* Error Alert */}
        <TenantErrorState error={error} />

        <DataErrorBoundary>
          {/* View Controls */}
          <TenantViewControls
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            viewPreferences={viewPreferences}
            setViewPreferences={setViewPreferences}
            totalCount={tenants.length}
          />

          {/* Tenant Views */}
          <TenantViewRenderer
            tenants={tenants}
            formattedTenants={formattedTenants}
            viewPreferences={viewPreferences}
            onEdit={handleEditTenant}
            onDelete={handleSuspendTenant}
            onViewDetails={handleViewDetails}
            tenantMetrics={{}}
          />
        </DataErrorBoundary>

        {/* Details Modal */}
        <TenantDetailsModalRefactored
          tenant={detailsTenant}
          formattedData={detailsFormattedData}
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          onEdit={handleDetailsEdit}
        />

        {/* Edit Modal */}
        <TenantEditModal
          tenant={editingTenant}
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onSave={handleSaveTenant}
          isSubmitting={updateTenantMutation.isPending}
        />
      </div>
    </TenantErrorBoundary>
  );
});

TenantManagementPage.displayName = 'TenantManagementPage';

export { TenantManagementPage };
export default TenantManagementPage;
