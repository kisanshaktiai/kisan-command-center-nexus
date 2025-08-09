
import React from 'react';
import { Plus, Users, Building, Archive, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedMetricCard } from '@/components/ui/optimized-metric-card';
import { TenantViewToggle } from '@/components/tenant/TenantViewToggle';
import { TenantFilters } from '@/components/tenant/TenantFilters';
import { TenantViewRenderer } from '@/features/tenant/components/TenantViewRenderer';
import { TenantDetailsModalRefactored } from '@/components/tenant/TenantDetailsModalRefactored';
import { TenantEditModalEnhanced } from '@/components/tenant/TenantEditModalEnhanced';
import { TenantCreationSuccess } from '@/components/tenant/TenantCreationSuccess';
import { TenantErrorState } from '@/features/tenant/components/TenantErrorState';
import { TenantLoadingState } from '@/features/tenant/components/TenantLoadingState';
import { useTenantPageState } from '@/features/tenant/hooks/useTenantPageState';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';

const TenantManagementPage: React.FC = () => {
  const {
    tenants,
    formattedTenants,
    isLoading,
    error,
    isSubmitting,
    tenantMetrics,
    refreshMetrics,
    creationSuccess,
    clearCreationSuccess,
    detailsTenant,
    isDetailsModalOpen,
    detailsFormattedData,
    editingTenant,
    isEditModalOpen,
    viewPreferences,
    setViewPreferences,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    handleCreateTenant,
    handleViewDetails,
    handleDetailsEdit,
    handleEditTenant,
    handleSaveTenant,
    closeDetailsModal,
    closeEditModal,
  } = useTenantPageState();

  const handleDeleteTenant = async (tenantId: string): Promise<boolean> => {
    console.log('TenantManagementPage: Delete/suspend tenant:', tenantId);
    // Implement delete/suspend logic here
    return true;
  };

  const handleCreateTenantClick = () => {
    // Create a proper tenant data structure for creation
    const newTenantData: CreateTenantDTO = {
      name: 'New Tenant',
      slug: 'new-tenant',
      type: 'agri_company' as const,
      status: 'trial' as const,
      subscription_plan: 'Kisan_Basic' as const,
      owner_name: '',
      owner_email: '',
    };
    handleCreateTenant(newTenantData);
  };

  if (isLoading) return <TenantLoadingState />;
  if (error) return <TenantErrorState error={error} />;

  // Calculate summary metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const trialTenants = tenants.filter(t => t.status === 'trial').length;
  const archivedTenants = tenants.filter(t => t.status === 'archived').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground text-sm">
            Manage organizations and their configurations
          </p>
        </div>
        <Button onClick={handleCreateTenantClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Tenant
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <OptimizedMetricCard
          title="Total Tenants"
          value={totalTenants}
          icon={Building}
          gradient="from-blue-600 to-purple-600"
          iconColor="bg-blue-600"
          textColor="white"
        />
        <OptimizedMetricCard
          title="Active Tenants"
          value={activeTenants}
          icon={Users}
          gradient="from-green-500 to-emerald-600"
          iconColor="bg-green-600"
          textColor="white"
        />
        <OptimizedMetricCard
          title="Trial Tenants"
          value={trialTenants}
          icon={Clock}
          gradient="from-orange-500 to-red-500"
          iconColor="bg-orange-600"
          textColor="white"
        />
        <OptimizedMetricCard
          title="Archived Tenants"
          value={archivedTenants}
          icon={Archive}
          gradient="from-gray-600 to-slate-700"
          iconColor="bg-gray-600"
          textColor="white"
        />
      </div>

      {/* Filters and View Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <TenantFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />
        </div>
        <TenantViewToggle
          preferences={viewPreferences}
          onPreferencesChange={setViewPreferences}
          totalCount={tenants.length}
        />
      </div>

      {/* Tenant Display */}
      <TenantViewRenderer
        tenants={tenants}
        formattedTenants={formattedTenants}
        viewPreferences={viewPreferences}
        onEdit={handleEditTenant}
        onDelete={handleDeleteTenant}
        onViewDetails={handleViewDetails}
        tenantMetrics={tenantMetrics}
      />

      {/* Modals */}
      {isDetailsModalOpen && detailsTenant && detailsFormattedData && (
        <TenantDetailsModalRefactored
          isOpen={isDetailsModalOpen}
          onClose={closeDetailsModal}
          tenant={detailsTenant}
          formattedData={detailsFormattedData}
          onEdit={() => handleDetailsEdit(detailsTenant)}
          metrics={tenantMetrics[detailsTenant.id]}
        />
      )}

      {isEditModalOpen && editingTenant && (
        <TenantEditModalEnhanced
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          tenant={editingTenant}
          onSave={(id: string, data: UpdateTenantDTO) => handleSaveTenant(id, data)}
          isSubmitting={isSubmitting}
        />
      )}

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

export default TenantManagementPage;
export { TenantManagementPage };
