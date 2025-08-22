
import React from 'react';
import { useTenantPageState } from '../hooks/useTenantPageState';
import { TenantPageHeader } from './TenantPageHeader';
import { TenantPageContent } from './TenantPageContent';
import { TenantPageModals } from './TenantPageModals';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const TenantManagementPage: React.FC = () => {
  const {
    // Data
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
    handleCreateTenant,
    handleViewDetails,
    handleDetailsEdit,
    handleEditTenant,
    handleSaveTenant,
    closeDetailsModal,
    closeEditModal,
  } = useTenantPageState();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tenants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading tenants: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <TenantPageHeader
        creationSuccess={creationSuccess}
        onClearSuccess={clearCreationSuccess}
      />

      <TenantPageContent
        formattedTenants={formattedTenants}
        viewPreferences={viewPreferences}
        setViewPreferences={setViewPreferences}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onCreateTenant={handleCreateTenant}
        onViewDetails={handleViewDetails}
        onEditTenant={handleEditTenant}
      />

      <TenantPageModals
        detailsTenant={detailsTenant}
        isDetailsModalOpen={isDetailsModalOpen}
        onCloseDetails={closeDetailsModal}
        onDetailsEdit={handleDetailsEdit}
        editingTenant={editingTenant}
        isEditModalOpen={isEditModalOpen}
        onCloseEdit={closeEditModal}
        onSaveTenant={handleSaveTenant}
      />
    </div>
  );
};

export default TenantManagementPage;
