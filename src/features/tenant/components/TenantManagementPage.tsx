
import React, { memo } from 'react';
import { TenantErrorBoundary } from '@/components/error-boundaries/TenantErrorBoundary';
import { DataErrorBoundary } from '@/components/error-boundaries/DataErrorBoundary';
import { TenantManagementHeader } from './TenantManagementHeader';
import { TenantViewControls } from './TenantViewControls';
import { TenantViewRenderer } from './TenantViewRenderer';
import { TenantDetailsModalRefactored } from '@/components/tenant/TenantDetailsModalRefactored';
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
    handleDeleteTenant,
    handleViewDetails,
    handleDetailsEdit,
    closeDetailsModal,
  } = useTenantPageState();

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
            onEdit={() => {}} // Will be implemented with proper edit modal
            onDelete={handleDeleteTenant}
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
      </div>
    </TenantErrorBoundary>
  );
});

TenantManagementPage.displayName = 'TenantManagementPage';

export { TenantManagementPage };
export default TenantManagementPage;
