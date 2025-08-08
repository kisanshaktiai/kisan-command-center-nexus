
import React, { memo } from 'react';
import { TenantErrorBoundary } from '@/components/error-boundaries/TenantErrorBoundary';
import { DataErrorBoundary } from '@/components/error-boundaries/DataErrorBoundary';
import { TenantManagementHeader } from './TenantManagementHeader';
import { TenantViewControls } from './TenantViewControls';
import { TenantViewRenderer } from './TenantViewRenderer';
import { TenantDetailsModal } from '@/components/tenant/TenantDetailsModal';
import { TenantCreationSuccess } from '@/components/tenant/TenantCreationSuccess';
import { useTenantData } from '../hooks/useTenantData';
import { useTenantMutations } from '../hooks/useTenantMutations';
import { useTenantFiltering } from '../hooks/useTenantFiltering';
import { useTenantUIState } from '../hooks/useTenantUIState';
import { Tenant } from '@/types/tenant';
import { UpdateTenantDTO } from '@/data/types/tenant';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const TenantManagementPage = memo(() => {
  // Data hooks
  const { tenants, isLoading, error } = useTenantData();
  const { createTenantMutation, updateTenantMutation, deleteTenantMutation, isSubmitting } = useTenantMutations();
  
  // UI state hooks
  const { 
    detailsTenant, 
    isDetailsModalOpen, 
    creationSuccess,
    handleViewDetails,
    closeDetailsModal,
    handleCreateSuccess,
    clearCreationSuccess 
  } = useTenantUIState();
  
  // Filtering hooks
  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    viewPreferences,
    setViewPreferences,
    filteredTenants,
  } = useTenantFiltering({ tenants });

  // Action handlers
  const handleCreateTenant = async (data: any): Promise<boolean> => {
    try {
      const result = await createTenantMutation.mutateAsync(data);
      handleCreateSuccess({
        tenantName: data.name,
        adminEmail: data.owner_email,
        hasEmailSent: true
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleUpdateTenant = async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    try {
      await updateTenantMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteTenant = async (id: string): Promise<boolean> => {
    try {
      await deleteTenantMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const handleEdit = (tenant: Tenant) => {
    const updateData: UpdateTenantDTO = {
      name: tenant.name,
      status: tenant.status as any,
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
    handleUpdateTenant(tenant.id, updateData);
  };

  const handleDetailsEdit = (tenant: Tenant) => {
    const updateData: UpdateTenantDTO = {
      name: tenant.name,
      status: tenant.status as any,
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
            onClose={clearCreationSuccess}
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
            setViewPreferences={setViewPreferences}
            totalCount={filteredTenants.length}
          />

          {/* Tenant Views */}
          <TenantViewRenderer
            tenants={filteredTenants}
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
