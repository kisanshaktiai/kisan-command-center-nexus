
import React, { memo } from 'react';
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

const TenantManagementPage = memo(() => {
  const {
    // Data
    tenants,
    formattedTenants,
    isLoading,
    error,
    isSubmitting,

    // Analytics
    tenantMetrics,
    refreshMetrics,

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
    editingTenant,
    isEditModalOpen,

    // Actions
    handleCreateTenant,
    handleViewDetails,
    handleDetailsEdit,
    handleEditTenant,
    handleSaveTenant,
    closeDetailsModal,
    closeEditModal,
  } = useTenantPageState();

  const handleSuspendTenant = async (tenantId: string): Promise<boolean> => {
    console.log('TenantManagementPage: Suspend/Delete tenant:', tenantId);
    try {
      // Simulate suspension action
      await new Promise(resolve => setTimeout(resolve, 1000));
      refreshMetrics(); // Refresh metrics after action
      return true;
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return <TenantLoadingState />;
  }

  console.log('TenantManagementPage: Rendering with tenants:', tenants.length);
  console.log('TenantManagementPage: Edit modal open:', isEditModalOpen, 'editing:', editingTenant?.id);
  console.log('TenantManagementPage: Details modal open:', isDetailsModalOpen, 'details:', detailsTenant?.id);

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
            tenantMetrics={tenantMetrics}
          />
        </DataErrorBoundary>

        {/* Details Modal with Analytics */}
        <TenantDetailsModalRefactored
          tenant={detailsTenant}
          formattedData={detailsFormattedData}
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          onEdit={handleDetailsEdit}
          metrics={detailsTenant ? tenantMetrics[detailsTenant.id] : undefined}
        />

        {/* Edit Modal */}
        <TenantEditModal
          tenant={editingTenant}
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onSave={handleSaveTenant}
          isSubmitting={isSubmitting}
        />
      </div>
    </TenantErrorBoundary>
  );
});

TenantManagementPage.displayName = 'TenantManagementPage';

export { TenantManagementPage };
export default TenantManagementPage;
