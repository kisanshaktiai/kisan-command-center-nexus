import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantManagement } from '@/hooks/useTenantManagement';
import { TenantCard } from '@/components/tenant/TenantCard';
import { TenantCreationSuccess } from '@/components/tenant/TenantCreationSuccess';
import { TenantForm } from '@/components/tenant/TenantForm';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  Grid3X3, 
  List, 
  Filter, 
  Download,
  Users,
  Building2,
  TrendingUp,
  AlertCircle,
  MoreVertical,
  Pause,
  Play,
  Archive
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantStatus } from '@/types/enums';
import { useTenantSoftDelete } from '@/hooks/useTenantSoftDelete';
import { TenantActionDialog } from '@/components/tenant/TenantActionDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Stats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
}

const TenantManagement = () => {
  const {
    tenants: tenantsData,
    loading,
    error,
    formData,
    setFormData,
    handleCreateTenant,
    handleDeleteTenant,
    resetForm,
    populateFormForEdit,
    creationSuccess,
    setCreationSuccess,
  } = useTenantManagement();

  // Extract actual tenants array from the hook return
  const tenants = Array.isArray(tenantsData) ? tenantsData : [];

  const { suspendTenant, reactivateTenant, archiveTenant, isLoading: softDeleteLoading } = useTenantSoftDelete();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [actionDialog, setActionDialog] = useState<{
    tenant: Tenant | null;
    action: 'suspend' | 'reactivate' | 'archive' | null;
    isOpen: boolean;
  }>({
    tenant: null,
    action: null,
    isOpen: false
  });

  useEffect(() => {
    document.title = 'Tenant Management | KisanHub';
  }, []);

  const filteredAndSortedTenants = useMemo(() => {
    let filtered = tenants.filter((tenant) => {
      const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tenant.owner_email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      const matchesType = typeFilter === 'all' || tenant.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tenants, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  const stats = useMemo(() => {
    return {
      total: tenants.length,
      active: tenants.filter(t => t.status === 'active').length,
      trial: tenants.filter(t => t.status === 'trial').length,
      suspended: tenants.filter(t => t.status === 'suspended').length,
    };
  }, [tenants]);

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    populateFormForEdit(tenant);
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingTenant(null);
    resetForm();
  };

  const handleSubmit = async (tenantData: any): Promise<boolean> => {
    return await handleCreateTenant(tenantData);
  };

  const handleDeleteTenantWrapper = async (tenantId: string) => {
    await handleDeleteTenant(tenantId);
  };

  const handleSuspendTenant = (tenant: Tenant) => {
    setActionDialog({
      tenant,
      action: 'suspend',
      isOpen: true
    });
  };

  const handleReactivateTenant = (tenant: Tenant) => {
    setActionDialog({
      tenant,
      action: 'reactivate',
      isOpen: true
    });
  };

  const handleArchiveTenant = (tenant: Tenant) => {
    setActionDialog({
      tenant,
      action: 'archive',
      isOpen: true
    });
  };

  const handleActionConfirm = async (data: any) => {
    const { action } = actionDialog;
    let success = false;

    switch (action) {
      case 'suspend':
        success = await suspendTenant(data);
        break;
      case 'reactivate':
        success = await reactivateTenant(data.tenantId);
        break;
      case 'archive':
        success = await archiveTenant(data);
        break;
    }

    if (success) {
      setActionDialog({ tenant: null, action: null, isOpen: false });
      // Refresh tenant list would happen automatically through React Query
    }
  };

  const closeActionDialog = () => {
    setActionDialog({ tenant: null, action: null, isOpen: false });
  };

  const getTenantActions = (tenant: Tenant) => {
    const actions = [];

    // Edit action (always available)
    actions.push(
      <DropdownMenuItem key="edit" onClick={() => handleEdit(tenant)}>
        Edit Tenant
      </DropdownMenuItem>
    );

    // Status-specific actions
    if (tenant.status === 'active' || tenant.status === 'trial') {
      actions.push(
        <DropdownMenuItem 
          key="suspend" 
          onClick={() => handleSuspendTenant(tenant)}
          className="text-orange-600"
        >
          <Pause className="h-4 w-4 mr-2" />
          Suspend Tenant
        </DropdownMenuItem>
      );
    }

    if (tenant.status === 'suspended') {
      actions.push(
        <DropdownMenuItem 
          key="reactivate" 
          onClick={() => handleReactivateTenant(tenant)}
          className="text-green-600"
        >
          <Play className="h-4 w-4 mr-2" />
          Reactivate Tenant
        </DropdownMenuItem>
      );
      
      actions.push(
        <DropdownMenuSeparator key="sep-archive" />,
        <DropdownMenuItem 
          key="archive" 
          onClick={() => handleArchiveTenant(tenant)}
          className="text-blue-600"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive Data
        </DropdownMenuItem>
      );
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading tenants</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {creationSuccess && (
        <TenantCreationSuccess 
          creationSuccess={creationSuccess}
          onClose={() => setCreationSuccess(null)}
        />
      )}

      
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage and monitor all tenant organizations</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
                </DialogTitle>
              </DialogHeader>
              <TenantForm
                mode={editingTenant ? "edit" : "create"}
                initialData={editingTenant ? formData : undefined}
                onSubmit={handleSubmit}
                onCancel={handleCloseDialog}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
            <Building2 className="h-5 w-5 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Active</p>
              <p className="text-lg font-bold text-green-600">{stats.active}</p>
            </div>
            <Users className="h-5 w-5 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Trial</p>
              <p className="text-lg font-bold text-blue-600">{stats.trial}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Suspended</p>
              <p className="text-lg font-bold text-orange-600">{stats.suspended}</p>
            </div>
            <AlertCircle className="h-5 w-5 text-orange-500" />
          </div>
        </Card>
      </div>

      
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="agri_company">Agri Company</SelectItem>
                <SelectItem value="dealer">Dealer</SelectItem>
                <SelectItem value="ngo">NGO</SelectItem>
                <SelectItem value="government">Government</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as 'name' | 'created_at' | 'status');
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="status-asc">Status A-Z</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {filteredAndSortedTenants.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenants found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Get started by creating your first tenant'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Tenant
            </Button>
          )}
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
          : "space-y-4"
        }>
          {filteredAndSortedTenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onEdit={() => handleEdit(tenant)}
              onDelete={async () => await handleDeleteTenantWrapper(tenant.id)}
              onSuspend={() => handleSuspendTenant(tenant)}
              onReactivate={() => handleReactivateTenant(tenant)}
              onArchive={() => handleArchiveTenant(tenant)}
            />
          ))}
        </div>
      )}

      <TenantActionDialog
        tenant={actionDialog.tenant}
        action={actionDialog.action}
        isOpen={actionDialog.isOpen}
        onClose={closeActionDialog}
        onConfirm={handleActionConfirm}
        isLoading={softDeleteLoading}
      />
    </div>
  );
};

export default TenantManagement;
