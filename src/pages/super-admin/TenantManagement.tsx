import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Loader2, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TenantCard } from '@/components/tenant/TenantCard';
import { TenantForm } from '@/components/tenant/TenantForm';
import { TenantService } from '@/services/tenantService';
import { Tenant, TenantFormData, SubscriptionPlan } from '@/types/tenant';
import { TenantOnboardingPanel } from '@/components/tenant/TenantOnboardingPanel';

export default function TenantManagement() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan>('all');
  const queryClient = useQueryClient();

  // Fetch tenants
  const { data: tenants = [], isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => TenantService.fetchTenants(),
  });

  // Create tenant mutation
  const createTenantMutation = useMutation(
    (formData: TenantFormData) => TenantService.createTenant(formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        setIsFormOpen(false);
      },
    }
  );

  // Update tenant mutation
  const updateTenantMutation = useMutation(
    (tenantData: { tenant: Tenant; formData: TenantFormData }) =>
      TenantService.updateTenant(tenantData.tenant, tenantData.formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        setIsFormOpen(false);
        setSelectedTenant(null);
      },
    }
  );

  // Delete tenant mutation
  const deleteTenantMutation = useMutation(
    (tenantId: string) => TenantService.deleteTenant(tenantId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        setIsDeleteDialogOpen(false);
        setSelectedTenant(null);
      },
    }
  );

  const handleCreate = async (formData: TenantFormData) => {
    createTenantMutation.mutate(formData as any);
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsFormOpen(true);
  };

  const handleUpdate = async (formData: TenantFormData) => {
    if (!selectedTenant) return;
    updateTenantMutation.mutate({ tenant: selectedTenant, formData } as any);
  };

  const handleDelete = (tenantId: string) => {
    setSelectedTenant(tenants.find((tenant) => tenant.id === tenantId) || null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTenant) return;
    deleteTenantMutation.mutate(selectedTenant.id);
  };

  const handleViewOnboarding = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowOnboarding(true);
  };

  // Filter tenants
  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.slug?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    const matchesPlan = planFilter === 'all' || tenant.subscription_plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">Manage and configure tenant organizations</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">All Tenants</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter tenants based on different criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  type="search"
                  placeholder="Search by name or slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={(value) => setPlanFilter(value as SubscriptionPlan)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="Kisan_Basic">Kisan – Starter</SelectItem>
                    <SelectItem value="Shakti_Growth">Shakti – Growth</SelectItem>
                    <SelectItem value="AI_Enterprise">AI – Enterprise</SelectItem>
                    <SelectItem value="custom">Custom Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading tenants...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
              Error: {error.message}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTenants.map((tenant) => (
                <div key={tenant.id} className="relative">
                  <TenantCard
                    tenant={tenant}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleViewOnboarding(tenant)}
                  >
                    Onboarding
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4">
          {selectedTenant ? (
            <TenantOnboardingPanel
              tenantId={selectedTenant.id}
              tenantName={selectedTenant.name}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Select a tenant to view onboarding progress</p>
              </CardContent>
            </Card>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
            {tenants.slice(0, 4).map((tenant) => (
              <Card key={tenant.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTenant(tenant)}>
                <CardHeader>
                  <CardTitle className="text-lg">{tenant.name}</CardTitle>
                  <CardDescription>{tenant.subscription_plan}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Tenant Dialog */}
      <Dialog open={isFormOpen} onOpenChange={() => setIsFormOpen(false)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTenant ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
            <DialogDescription>
              {selectedTenant ? 'Update tenant details' : 'Create a new tenant organization'}
            </DialogDescription>
          </DialogHeader>
          <TenantForm
            onSubmit={selectedTenant ? handleUpdate : handleCreate}
            initialValues={selectedTenant}
            isLoading={createTenantMutation.isLoading || updateTenantMutation.isLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={() => setIsDeleteDialogOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tenant? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
