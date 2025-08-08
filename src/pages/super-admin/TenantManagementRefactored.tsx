
import React, { useState } from 'react';
import { TenantErrorBoundary } from '@/components/error-boundaries/TenantErrorBoundary';
import { DataErrorBoundary } from '@/components/error-boundaries/DataErrorBoundary';
import { TenantManagementHeader } from '@/components/tenant/page-sections/TenantManagementHeader';
import { TenantViewControls } from '@/components/tenant/page-sections/TenantViewControls';
import { TenantViewRenderer } from '@/components/tenant/page-sections/TenantViewRenderer';
import { TenantDetailsModal } from '@/components/tenant/TenantDetailsModal';
import { TenantCreationSuccess } from '@/components/tenant/TenantCreationSuccess';
import { useTenants, useCreateTenantMutation, useUpdateTenantMutation, useDeleteTenantMutation } from '@/data/hooks/useTenantData';
import { Tenant } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function TenantManagementRefactored() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Modal states
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<any>(null);

  // Data hooks
  const filters = { searchTerm, filterType, filterStatus };
  const { data: rawTenants = [], isLoading, error } = useTenants(filters);
  const createTenantMutation = useCreateTenantMutation();
  const updateTenantMutation = useUpdateTenantMutation();
  const deleteTenantMutation = useDeleteTenantMutation();

  // Convert raw tenant data to proper Tenant type
  const tenants: Tenant[] = rawTenants.map(tenant => ({
    ...tenant,
    metadata: typeof tenant.metadata === 'string' 
      ? JSON.parse(tenant.metadata) 
      : tenant.metadata || {},
    business_address: typeof tenant.business_address === 'string'
      ? JSON.parse(tenant.business_address)
      : tenant.business_address || null
  }));

  // Filter tenants based on search and filters
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tenant.type === filterType;
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort tenants
  const sortedTenants = [...filteredTenants].sort((a, b) => {
    const { sortBy, sortOrder } = viewPreferences;
    let aValue = a[sortBy as keyof Tenant] as string;
    let bValue = b[sortBy as keyof Tenant] as string;
    
    if (sortBy === 'created_at') {
      aValue = new Date(aValue).getTime().toString();
      bValue = new Date(bValue).getTime().toString();
    }
    
    const comparison = aValue?.localeCompare(bValue) || 0;
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const handleViewDetails = (tenant: Tenant) => {
    setDetailsTenant(tenant);
    setIsDetailsModalOpen(true);
  };

  const handleCreateTenant = async (tenantData: any): Promise<boolean> => {
    try {
      await createTenantMutation.mutateAsync(tenantData);
      setCreationSuccess({
        tenantName: tenantData.name,
        adminEmail: tenantData.admin_email,
        hasEmailSent: true
      });
      return true;
    } catch (error) {
      console.error('Error creating tenant:', error);
      return false;
    }
  };

  const handleUpdateTenant = async (id: string, tenantData: any) => {
    try {
      await updateTenantMutation.mutateAsync({ id, data: tenantData });
    } catch (error) {
      console.error('Error updating tenant:', error);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    try {
      await deleteTenantMutation.mutateAsync(tenantId);
    } catch (error) {
      console.error('Error deleting tenant:', error);
    }
  };

  const handlePreferencesChange = (preferences: TenantViewPreferences) => {
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
        <TenantManagementHeader onCreateTenant={handleCreateTenant} />

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
            totalCount={filteredTenants.length}
          />

          {/* Tenant Views */}
          <TenantViewRenderer
            tenants={sortedTenants}
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
}
