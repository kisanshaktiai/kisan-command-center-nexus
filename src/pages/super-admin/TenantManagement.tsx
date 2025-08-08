import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, AlertCircle, Building2 } from 'lucide-react';
import { TenantForm } from '@/components/tenant/TenantForm';
import { TenantFilters } from '@/components/tenant/TenantFilters';
import { TenantViewToggle } from '@/components/tenant/TenantViewToggle';
import { TenantMetricsCard } from '@/components/tenant/TenantMetricsCard';
import { TenantListView } from '@/components/tenant/TenantListView';
import { TenantDetailsModal } from '@/components/tenant/TenantDetailsModal';
import { TenantCreationSuccess } from '@/components/tenant/TenantCreationSuccess';
import { Tenant, TenantFormData } from '@/types/tenant';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTenantManagement } from '@/hooks/useTenantManagement';

export default function TenantManagement() {
  const {
    tenants,
    loading,
    error,
    isSubmitting,
    tenantMetrics,
    viewPreferences,
    formData,
    creationSuccess,
    setViewPreferences,
    setFormData,
    handleCreateTenant: createTenant,
    handleUpdateTenant: updateTenant,
    handleDeleteTenant: deleteTenant,
    resetForm,
    populateFormForEdit,
    setError,
    setCreationSuccess,
  } = useTenantManagement();

  // Local dialog state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleCreateTenant = async (tenantData: TenantFormData): Promise<boolean> => {
    // Update the form data in the hook
    setFormData(tenantData);
    const success = await createTenant();
    if (success) {
      setIsCreateDialogOpen(false);
    }
    return success;
  };

  const handleUpdateTenant = async (tenantData: TenantFormData): Promise<boolean> => {
    if (!editingTenant) return false;
    // Update the form data in the hook
    setFormData(tenantData);
    const success = await updateTenant(editingTenant);
    if (success) {
      setIsEditDialogOpen(false);
      setEditingTenant(null);
    }
    return success;
  };

  const openEditDialog = (tenant: Tenant) => {
    console.log('Opening edit dialog for tenant:', tenant);
    setEditingTenant(tenant);
    populateFormForEdit(tenant);
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (tenant: Tenant) => {
    setDetailsTenant(tenant);
    setIsDetailsModalOpen(true);
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tenant.type === filterType;
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort tenants based on preferences
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

  const renderTenantView = () => {
    switch (viewPreferences.mode) {
      case 'small-cards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedTenants.map((tenant) => (
              <TenantMetricsCard
                key={tenant.id}
                tenant={tenant}
                metrics={tenantMetrics[tenant.id]}
                size="small"
                onEdit={openEditDialog}
                onDelete={deleteTenant}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        );
      
      case 'large-cards':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedTenants.map((tenant) => (
              <TenantMetricsCard
                key={tenant.id}
                tenant={tenant}
                metrics={tenantMetrics[tenant.id]}
                size="large"
                onEdit={openEditDialog}
                onDelete={deleteTenant}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        );
      
      case 'list':
        return (
          <TenantListView
            tenants={sortedTenants}
            metrics={tenantMetrics}
            onEdit={openEditDialog}
            onDelete={deleteTenant}
            onViewDetails={handleViewDetails}
          />
        );
      
      case 'analytics':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedTenants.map((tenant) => (
              <TenantMetricsCard
                key={tenant.id}
                tenant={tenant}
                metrics={tenantMetrics[tenant.id]}
                size="large"
                onEdit={openEditDialog}
                onDelete={deleteTenant}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">Manage and configure tenant organizations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              console.log('Opening create dialog');
              resetForm();
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Set up a new tenant organization with their subscription and admin account. 
                A welcome email with login credentials will be sent automatically.
              </DialogDescription>
            </DialogHeader>
            <TenantForm 
              mode="create"
              onSubmit={handleCreateTenant}
              onCancel={() => setIsCreateDialogOpen(false)}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => setError(null)}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* View Controls */}
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
          totalCount={filteredTenants.length}
        />
      </div>

      {/* Tenant Views */}
      {renderTenantView()}

      {/* Empty State */}
      {!loading && filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-muted-foreground">
            {tenants.length === 0 ? 'No tenants found' : 'No tenants match your filters'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenants.length === 0 
              ? 'Get started by creating your first tenant.' 
              : 'Try adjusting your search or filters.'
            }
          </p>
          {tenants.length === 0 && (
            <Button 
              className="mt-4" 
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Tenant
            </Button>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information, subscription, and limits.
            </DialogDescription>
          </DialogHeader>
          <TenantForm 
            mode="edit"
            onSubmit={handleUpdateTenant}
            onCancel={() => setIsEditDialogOpen(false)}
            initialData={editingTenant || undefined}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <TenantDetailsModal
        tenant={detailsTenant}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onEdit={openEditDialog}
      />
    </div>
  );
}
