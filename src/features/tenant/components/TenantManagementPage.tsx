
import React from 'react';
import { useTenantPageState } from '../hooks/useTenantPageState';
import { TenantFilters } from '@/components/tenant/TenantFilters';
import { TenantCreateDialog } from '@/components/tenant/TenantCreateDialog';
import TenantEditModal from '@/components/tenant/TenantEditModal';
import { TenantDetailsModal } from '@/components/tenant/TenantDetailsModal';
import { TenantListView } from '@/components/tenant/TenantListView';
import { TenantGridView } from '@/components/tenant/TenantGridView';
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage tenants, subscriptions, and configurations
          </p>
        </div>
      </div>

      {creationSuccess && (
        <Alert>
          <AlertDescription>
            Tenant "{creationSuccess.tenantName}" created successfully!
            {creationSuccess.hasEmailSent && (
              <span className="ml-2">
                Invitation email sent to {creationSuccess.adminEmail}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <TenantFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

      <TenantCreateDialog 
        isOpen={false}
        onClose={() => {}}
        onCreateTenant={handleCreateTenant} 
      />

      {viewPreferences.mode === 'list' ? (
        <TenantListView
          tenants={formattedTenants as any[]}
          onViewDetails={handleViewDetails}
          onEditTenant={handleEditTenant}
        />
      ) : (
        <TenantGridView
          tenants={formattedTenants as any[]}
          viewMode={viewPreferences.mode === 'analytics' ? 'grid' : viewPreferences.mode}
          onViewDetails={handleViewDetails}
          onEditTenant={handleEditTenant}
        />
      )}

      <TenantDetailsModal
        tenant={detailsTenant}
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        onEdit={handleDetailsEdit}
      />

      <TenantEditModal
        tenant={editingTenant}
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSave={handleSaveTenant}
      />
    </div>
  );
};

export default TenantManagementPage;
