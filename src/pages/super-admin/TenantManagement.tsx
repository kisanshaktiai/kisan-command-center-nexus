import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { TenantViewControls } from '@/components/tenant/page-sections/TenantViewControls';
import { TenantViewRenderer } from '@/features/tenant/components/TenantViewRenderer';
import { TenantDetailsModal } from '@/components/tenant/TenantDetailsModal';
import { TenantEditModal } from '@/components/tenant/TenantEditModal';
import { TenantCreationSuccess } from '@/components/tenant/TenantCreationSuccess';
import { TenantOverviewMetrics } from '@/components/tenant/TenantOverviewMetrics';
import { EnhancedTenantManagementHeader } from '@/components/tenant/EnhancedTenantManagementHeader';
import { BulkTenantValidation } from '@/components/tenant/BulkTenantValidation';
import { useTenantPageState } from '@/features/tenant/hooks/useTenantPageState';

const TenantManagement: React.FC = () => {
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

  const handleDeleteTenant = async (tenantId: string): Promise<boolean> => {
    // TODO: Implement delete functionality
    console.log('Delete tenant:', tenantId);
    return false;
  };

  const handleRefresh = () => {
    refreshMetrics();
    // Force re-fetch of tenants data
    window.location.reload();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading tenants: {error.message}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Create Button */}
      <EnhancedTenantManagementHeader
        onCreateTenant={handleCreateTenant}
        onRefresh={handleRefresh}
        isSubmitting={isSubmitting}
      />

      {/* Bulk Tenant Validation */}
      {tenants.length > 0 && (
        <BulkTenantValidation 
          tenants={tenants}
          onValidationComplete={(results) => {
            console.log('Bulk validation completed:', results);
          }}
        />
      )}

      {/* Overview Metrics Cards */}
      <TenantOverviewMetrics 
        tenants={tenants}
        isLoading={isLoading}
      />

      {/* Controls */}
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

      {/* Tenant Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading tenants...</p>
          </div>
        </div>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No tenants found</p>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by creating your first tenant organization.'}
              </p>
              <Button onClick={() => handleCreateTenant}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Tenant
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <TenantViewRenderer
          tenants={tenants}
          formattedTenants={formattedTenants}
          viewPreferences={viewPreferences}
          onEdit={handleEditTenant}
          onDelete={handleDeleteTenant}
          onViewDetails={handleViewDetails}
          tenantMetrics={tenantMetrics}
        />
      )}

      {/* Enhanced Details Modal with Admin User Management */}
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

      {/* Creation Success Modal */}
      {creationSuccess && (
        <TenantCreationSuccess
          tenantName={creationSuccess.tenantName}
          adminEmail={creationSuccess.adminEmail}
          hasEmailSent={creationSuccess.hasEmailSent}
          onClose={clearCreationSuccess}
        />
      )}
    </div>
  );
};

export default TenantManagement;
