
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { TenantViewControls } from '@/components/tenant/page-sections/TenantViewControls';
import { TenantViewRenderer } from './TenantViewRenderer';
import { TenantDetailsCompact } from '@/components/tenant/TenantDetailsCompact';
import { TenantEditModal } from '@/components/tenant/TenantEditModal';
import { TenantCreationSuccess } from '@/components/tenant/TenantCreationSuccess';
import { useTenantPageState } from '../hooks/useTenantPageState';

const TenantManagementPage: React.FC = () => {
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

    // Details modal - use compact version
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
  } = useTenantPageState();

  const handleDeleteTenant = async (tenantId: string): Promise<boolean> => {
    // TODO: Implement delete functionality
    console.log('Delete tenant:', tenantId);
    return false;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor all tenant organizations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={refreshMetrics} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

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
              <Button>
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

      {/* Modals - Use Compact Details Modal with proper props */}
      <TenantDetailsCompact
        tenant={detailsTenant}
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        onRefresh={refreshMetrics}
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

export { TenantManagementPage };
export default TenantManagementPage;
