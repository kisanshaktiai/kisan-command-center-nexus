
import React, { useState, memo } from 'react';
import { TenantErrorBoundary } from '@/components/error-boundaries/TenantErrorBoundary';
import { DataErrorBoundary } from '@/components/error-boundaries/DataErrorBoundary';
import { TenantManagementHeader } from './TenantManagementHeader';
import { TenantViewControls } from './TenantViewControls';
import { TenantViewRenderer } from './TenantViewRenderer';
import { TenantDetailsModal } from '@/components/tenant/TenantDetailsModal';
import { TenantCreationSuccess } from '@/components/tenant/TenantCreationSuccess';
import { useTenantManagement } from '../hooks/useTenantManagement';
import { Tenant } from '@/types/tenant';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const TenantManagementPage = memo(() => {
  const {
    tenants,
    isLoading,
    error,
    isSubmitting,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    viewPreferences,
    setViewPreferences,
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
  } = useTenantManagement();

  // Modal states
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<any>(null);

  const handleViewDetails = (tenant: Tenant) => {
    setDetailsTenant(tenant);
    setIsDetailsModalOpen(true);
  };

  const handleCreateSuccess = (result: any) => {
    setCreationSuccess(result);
  };

  const handlePreferencesChange = (preferences: any) => {
    setViewPreferences(preferences);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TenantErrorBoundary>
      <div className="space-y-6">
        {/* Success Notification */}
        {creationSuccess && (
          <TenantCreationSuccess
            tenantName={creationSuccess.tenantName}
            adminEmail={creationSuccess.adminEmail}
            hasEmailSent={creationSuccess.hasEmailSent}
            onClose={() => setCreationSuccess(null)}
          />
        )}

        {/* Header */}
        <TenantManagementHeader 
          onCreateTenant={handleCreateTenant}
          onCreateSuccess={handleCreateSuccess}
          isSubmitting={isSubmitting}
        />

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load tenants. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

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
            setViewPreferences={handlePreferencesChange}
            totalCount={tenants.length}
          />

          {/* Tenant Views */}
          <TenantViewRenderer
            tenants={tenants}
            viewPreferences={viewPreferences}
            onEdit={(tenant) => handleUpdateTenant(tenant.id, tenant)}
            onDelete={handleDeleteTenant}
            onViewDetails={handleViewDetails}
            tenantMetrics={{}}
          />
        </DataErrorBoundary>

        {/* Details Modal */}
        <TenantDetailsModal
          tenant={detailsTenant}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          onEdit={(tenant) => handleUpdateTenant(tenant.id, tenant)}
        />
      </div>
    </TenantErrorBoundary>
  );
});

TenantManagementPage.displayName = 'TenantManagementPage';

export default TenantManagementPage;
