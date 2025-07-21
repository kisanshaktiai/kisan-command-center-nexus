
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TenantCard } from '@/components/tenant/TenantCard';
import { TenantFilters } from '@/components/tenant/TenantFilters';
import { TenantForm, TenantFormData } from '@/components/tenant/TenantForm';
import { TenantDetailModal } from '@/components/tenant/TenantDetailModal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Tenant, TenantStatus, SubscriptionPlan, TenantType } from '@/types/tenant';

export default function TenantManagement() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    type: 'agri_company',
    status: 'trial',
    subscription_plan: 'Kisan_Basic'
  });
  
  const queryClient = useQueryClient();

  // Fetch tenants
  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['tenants', searchTerm, statusFilter, planFilter],
    queryFn: async () => {
      let query = supabase
        .from('tenants')
        .select('*');

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as TenantStatus);
      }

      if (planFilter !== 'all') {
        query = query.eq('subscription_plan', planFilter as SubscriptionPlan);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Tenant[];
    },
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      const { data: result, error } = await supabase.functions.invoke('create-tenant', {
        body: data
      });
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsFormOpen(false);
      resetForm();
      toast.success('Tenant created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create tenant: ${error.message}`);
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      if (!selectedTenant) throw new Error('No tenant selected');
      
      const updateData = {
        name: data.name,
        slug: data.slug,
        type: data.type as TenantType,
        status: data.status as TenantStatus,
        subscription_plan: data.subscription_plan as SubscriptionPlan,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
        business_registration: data.business_registration,
        business_address: data.business_address,
        established_date: data.established_date,
        subscription_start_date: data.subscription_start_date,
        subscription_end_date: data.subscription_end_date,
        trial_ends_at: data.trial_ends_at,
        max_farmers: data.max_farmers,
        max_dealers: data.max_dealers,
        max_products: data.max_products,
        max_storage_gb: data.max_storage_gb,
        max_api_calls_per_day: data.max_api_calls_per_day,
        subdomain: data.subdomain,
        custom_domain: data.custom_domain,
        metadata: data.metadata
      };

      const { data: result, error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', selectedTenant.id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsFormOpen(false);
      setSelectedTenant(null);
      resetForm();
      toast.success('Tenant updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update tenant: ${error.message}`);
    },
  });

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsDeleteDialogOpen(false);
      setSelectedTenant(null);
      toast.success('Tenant deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete tenant: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      type: 'agri_company',
      status: 'trial',
      subscription_plan: 'Kisan_Basic'
    });
  };

  const handleCreate = () => {
    createTenantMutation.mutate(formData);
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      type: tenant.type as any,
      status: tenant.status as any,
      subscription_plan: tenant.subscription_plan,
      owner_name: tenant.owner_name,
      owner_email: tenant.owner_email,
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
      metadata: tenant.metadata
    });
    setIsFormOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedTenant) return;
    updateTenantMutation.mutate(formData);
  };

  const handleDelete = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedTenant) return;
    deleteTenantMutation.mutate(selectedTenant.id);
  };

  const handleView = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedTenant(null);
    resetForm();
    setIsFormOpen(true);
  };

  const filteredTenants = tenants?.filter(tenant => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(searchTermLower) ||
      tenant.slug.toLowerCase().includes(searchTermLower)
    );
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage tenants, subscriptions, and configurations
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      <TenantFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={statusFilter}
        setFilterType={setStatusFilter}
        filterStatus={planFilter}
        setFilterStatus={setPlanFilter}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div>Loading tenants...</div>
        ) : error ? (
          <div>Error: {error.message}</div>
        ) : filteredTenants.length === 0 ? (
          <div>No tenants found.</div>
        ) : (
          filteredTenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onEdit={() => handleEdit(tenant)}
              onDelete={() => handleDelete(tenant)}
            />
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTenant ? 'Edit Tenant' : 'Create New Tenant'}
            </DialogTitle>
            <DialogDescription>
              {selectedTenant 
                ? 'Update tenant information and configuration.' 
                : 'Add a new tenant to the platform.'
              }
            </DialogDescription>
          </DialogHeader>
          <TenantForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={selectedTenant ? handleUpdate : handleCreate}
            isEditing={!!selectedTenant}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <TenantDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        tenant={selectedTenant}
      />

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete{' '}
              {selectedTenant?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
