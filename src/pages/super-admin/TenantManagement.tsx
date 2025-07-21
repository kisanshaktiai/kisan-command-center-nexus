import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus } from 'lucide-react';
import { TenantCard } from '@/components/tenant/TenantCard';
import { TenantForm } from '@/components/tenant/TenantForm';
import { TenantFilters } from '@/components/tenant/TenantFilters';
import { TenantService } from '@/services/tenantService';
import { Tenant, TenantFormData, TenantType, TenantStatus } from '@/types/tenant';

export default function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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

  const fetchTenants = async () => {
    try {
      setLoading(true);
      console.log('Fetching tenants...');
      const data = await TenantService.fetchTenants();
      console.log('Tenants fetched successfully:', data);
      setTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      // Error is already handled in TenantService with toast
    } finally {
      setLoading(false);
    }
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
        fetchTenants();
      }
      // Error handling is done in TenantService
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      // Error is already handled in TenantService with toast
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
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      // Error is already handled in TenantService with toast
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
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      // Error is already handled in TenantService with toast
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
      type: tenant.type as TenantType || 'agri_company',
      status: tenant.status as TenantStatus || 'trial',
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

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tenant.type === filterType;
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
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

      {/* Filters */}
      <TenantFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <TenantCard
            key={tenant.id}
            tenant={tenant}
            onEdit={openEditDialog}
            onDelete={handleDeleteTenant}
          />
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-muted-foreground">No tenants found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters.' 
              : 'Get started by creating your first tenant.'}
          </p>
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
    </div>
  );
}
