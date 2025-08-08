
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
import { UpdateTenantDTO } from '@/data/types/tenant';
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

  // Convert Tenant to UpdateTenantDTO
  const convertTenantToUpdateDTO = (tenant: Tenant): UpdateTenantDTO => {
    return {
      name: tenant.name,
      status: tenant.status as any, // Cast to handle type compatibility
      subscription_plan: tenant.subscription_plan,
      owner_phone: tenant.owner_phone,
      business_registration: tenant.business_registration,
      business_address: tenant.business_address,
      established_date: tenant.established_date,
      subscription_start_date: tenant.subscription_start_date,
      subscription_end_date: tenant.subscription_end_date,
      trial_ends_at: tenant.trial_ends_at,
      max_farmers: tenant.max_farmers,
      max_dealers: tenant.max_dealers,
      max_products: tenant.max_products,
      max_storage_gb: tenant.max_storage_gb,
      max_api_calls_per_day: tenant.max_api_calls_per_day,
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
      metadata: tenant.metadata,
    };
  };

  const handleEdit = (tenant: Tenant) => {
    const updateData = convertTenantToUpdateDTO(tenant);
    handleUpdateTenant(tenant.id, updateData);
  };

  const handleDetailsEdit = (tenant: Tenant) => {
    const updateData = convertTenantToUpdateDTO(tenant);
    handleUpdateTenant(tenant.id, updateData);
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
            onEdit={handleEdit}
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
          onEdit={handleDetailsEdit}
        />
      </div>
    </TenantErrorBoundary>
  );
});

TenantManagementPage.displayName = 'TenantManagementPage';

export { TenantManagementPage };
export default TenantManagementPage;
