import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, AlertCircle } from 'lucide-react';
import { TenantForm } from '@/components/tenant/TenantForm';
import { TenantFilters } from '@/components/tenant/TenantFilters';
import { TenantViewToggle } from '@/components/tenant/TenantViewToggle';
import { TenantMetricsCard } from '@/components/tenant/TenantMetricsCard';
import { TenantListView } from '@/components/tenant/TenantListView';
import { TenantDetailsModal } from '@/components/tenant/TenantDetailsModal';
import { TenantService } from '@/services/tenantService';
import { Tenant, TenantFormData, TenantType, TenantStatus } from '@/types/tenant';
import { TenantViewPreferences, TenantMetrics } from '@/types/tenantView';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';

export default function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantMetrics, setTenantMetrics] = useState<Record<string, TenantMetrics>>({});
  const { toast } = useToast();

  // View preferences state
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Form state with default values
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    type: 'agri_company',
    status: 'trial',
    subscription_plan: 'Kisan_Basic',
    max_farmers: 1000,
    max_dealers: 50,
    max_products: 100,
    max_storage_gb: 10,
    max_api_calls_per_day: 10000,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    // Load view preferences from localStorage
    const savedPreferences = localStorage.getItem('tenant-view-preferences');
    if (savedPreferences) {
      setViewPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  useEffect(() => {
    // Save view preferences to localStorage
    localStorage.setItem('tenant-view-preferences', JSON.stringify(viewPreferences));
  }, [viewPreferences]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching tenants...');
      const data = await TenantService.fetchTenants();
      console.log('Tenants fetched successfully:', data);
      setTenants(data);
      
      if (data.length === 0) {
        console.log('No tenants found in the database');
      }

      // Fetch metrics for tenants if in large cards or analytics view
      if (viewPreferences.mode === 'large-cards' || viewPreferences.mode === 'analytics') {
        fetchTenantsMetrics(data);
      }
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      const errorMessage = error.message || 'Failed to fetch tenants';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantsMetrics = async (tenantList: Tenant[]) => {
    const metricsPromises = tenantList.map(async (tenant) => {
      try {
        const response = await supabase.functions.invoke('tenant-limits-quotas', {
          body: { tenantId: tenant.id }
        });

        if (response.data) {
          return {
            tenantId: tenant.id,
            metrics: {
              usageMetrics: {
                farmers: { 
                  current: response.data.usage.farmers, 
                  limit: response.data.limits.farmers, 
                  percentage: (response.data.usage.farmers / response.data.limits.farmers) * 100 
                },
                dealers: { 
                  current: response.data.usage.dealers, 
                  limit: response.data.limits.dealers, 
                  percentage: (response.data.usage.dealers / response.data.limits.dealers) * 100 
                },
                products: { 
                  current: response.data.usage.products, 
                  limit: response.data.limits.products, 
                  percentage: (response.data.usage.products / response.data.limits.products) * 100 
                },
                storage: { 
                  current: response.data.usage.storage, 
                  limit: response.data.limits.storage, 
                  percentage: (response.data.usage.storage / response.data.limits.storage) * 100 
                },
                apiCalls: { 
                  current: response.data.usage.api_calls, 
                  limit: response.data.limits.api_calls, 
                  percentage: (response.data.usage.api_calls / response.data.limits.api_calls) * 100 
                },
              },
              growthTrends: {
                farmers: [10, 15, 25, 30, 45, 50, 65],
                revenue: [1000, 1200, 1500, 1800, 2100, 2400, 2700],
                apiUsage: [100, 150, 200, 250, 300, 350, 400],
              },
              healthScore: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
              lastActivityDate: new Date().toISOString(),
            }
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching metrics for tenant ${tenant.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(metricsPromises);
    const metricsMap: Record<string, TenantMetrics> = {};
    
    results.forEach((result) => {
      if (result) {
        metricsMap[result.tenantId] = result.metrics;
      }
    });

    setTenantMetrics(metricsMap);
  };

  const handleCreateTenant = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      console.log('Creating tenant with data:', formData);
      
      const result = await TenantService.createTenant(formData);
      console.log('Create tenant result:', result);

      if (result.success) {
        console.log('Tenant created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        await fetchTenants(); // Refresh the list
        toast({
          title: "Success",
          description: "Tenant created successfully",
        });
      }
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTenant = async () => {
    if (!editingTenant || isSubmitting) {
      console.error('No tenant selected for editing');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Updating tenant with data:', formData);
      
      const updatedTenant = await TenantService.updateTenant(editingTenant, formData);
      console.log('Tenant updated successfully:', updatedTenant);

      setTenants(prev => prev.map(t => t.id === editingTenant.id ? updatedTenant : t));
      setIsEditDialogOpen(false);
      setEditingTenant(null);
      resetForm();
      
      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Deleting tenant:', tenantId);
      await TenantService.deleteTenant(tenantId);
      console.log('Tenant deleted successfully');

      setTenants(prev => prev.filter(t => t.id !== tenantId));
      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenant",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (tenant: Tenant) => {
    console.log('Opening edit dialog for tenant:', tenant);
    setEditingTenant(tenant);
    
    // Safely handle metadata and business_address
    const metadata = tenant.metadata && typeof tenant.metadata === 'object' 
      ? tenant.metadata as Record<string, any>
      : {};
    
    const businessAddress = tenant.business_address && typeof tenant.business_address === 'object'
      ? tenant.business_address as Record<string, any>
      : tenant.business_address
        ? { address: tenant.business_address }
        : undefined;
    
    setFormData({
      name: tenant.name || '',
      slug: tenant.slug || '',
      type: (tenant.type as TenantType) || 'agri_company',
      status: (tenant.status as TenantStatus) || 'trial',
      owner_name: tenant.owner_name || '',
      owner_email: tenant.owner_email || '',
      owner_phone: tenant.owner_phone || '',
      business_registration: tenant.business_registration || '',
      business_address: businessAddress,
      established_date: tenant.established_date || '',
      subscription_plan: tenant.subscription_plan || 'Kisan_Basic',
      subscription_start_date: tenant.subscription_start_date || '',
      subscription_end_date: tenant.subscription_end_date || '',
      trial_ends_at: tenant.trial_ends_at || '',
      max_farmers: tenant.max_farmers || 1000,
      max_dealers: tenant.max_dealers || 50,
      max_products: tenant.max_products || 100,
      max_storage_gb: tenant.max_storage_gb || 10,
      max_api_calls_per_day: tenant.max_api_calls_per_day || 10000,
      subdomain: tenant.subdomain || '',
      custom_domain: tenant.custom_domain || '',
      metadata,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    console.log('Resetting form to default values');
    setFormData({
      name: '',
      slug: '',
      type: 'agri_company',
      status: 'trial',
      subscription_plan: 'Kisan_Basic',
      max_farmers: 1000,
      max_dealers: 50,
      max_products: 100,
      max_storage_gb: 10,
      max_api_calls_per_day: 10000,
    });
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
                onDelete={handleDeleteTenant}
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
                onDelete={handleDeleteTenant}
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
            onDelete={handleDeleteTenant}
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
                onDelete={handleDeleteTenant}
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
                Set up a new tenant organization with their subscription and limits.
              </DialogDescription>
            </DialogHeader>
            <TenantForm 
              formData={formData} 
              setFormData={setFormData} 
              onSubmit={handleCreateTenant}
              isEditing={false}
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
              onClick={() => {
                setError(null);
                fetchTenants();
              }}
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
            formData={formData} 
            setFormData={setFormData} 
            onSubmit={handleUpdateTenant}
            isEditing={true}
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
