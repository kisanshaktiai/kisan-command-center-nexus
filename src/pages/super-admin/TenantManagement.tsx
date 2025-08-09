import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Building2,
  Users,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail
} from 'lucide-react';
import { useTenantData } from '@/features/tenant/hooks/useTenantData';
import { useTenantManagement } from '@/features/tenant/hooks/useTenantManagement';
import { TenantDetailsModalEnhanced } from '@/components/tenant/TenantDetailsModalEnhanced';
import { TenantEditModalEnhanced } from '@/components/tenant/TenantEditModalEnhanced';
import { TenantDisplayService } from '@/services/TenantDisplayService';
import { useTenantAnalytics } from '@/features/tenant/hooks/useTenantAnalytics';
import { UpdateTenantDTO, createTenantID } from '@/types/tenant';
import { TenantForm } from '@/components/tenant/TenantForm';
import { TenantCardRefactored } from '@/components/tenant/TenantCardRefactored';
import { TenantMetricsCard } from '@/components/tenant/TenantMetricsCard';
import { OptimizedMetricCard } from '@/components/ui/optimized-metric-card';
import { Tenant, TenantFormData, TenantFilters } from '@/types/tenant';
import { TenantViewPreferences } from '@/types/tenantView';

const TenantManagement: React.FC = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Data hooks
  const filters: TenantFilters = {
    search: searchTerm,
    type: filterType || undefined,
    status: filterStatus || undefined,
  };

  const { data: tenants = [], isLoading, error, refetch } = useTenantData({ filters });
  const { 
    isSubmitting, 
    creationSuccess, 
    clearCreationSuccess,
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant 
  } = useTenantManagement();

  // Analytics integration
  const { tenantMetrics, refreshMetrics } = useTenantAnalytics({ 
    tenants,
    autoRefresh: true,
    refreshInterval: 30000 
  });

  // Format tenants for display
  const formattedTenants = TenantDisplayService.formatTenantsForDisplay(tenants);

  // Event handlers
  const handleCreateSuccess = async (tenantData: TenantFormData): Promise<boolean> => {
    const success = await handleCreateTenant(tenantData);
    if (success) {
      setIsCreateModalOpen(false);
      refetch();
      refreshMetrics();
    }
    return success;
  };

  const handleViewDetails = (tenant: Tenant) => {
    setDetailsTenant(tenant);
    setIsDetailsModalOpen(true);
    refreshMetrics();
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsEditModalOpen(true);
  };

  const handleDetailsEdit = (tenant: Tenant) => {
    setIsDetailsModalOpen(false);
    setDetailsTenant(null);
    setEditingTenant(tenant);
    setIsEditModalOpen(true);
  };

  const handleSaveTenant = async (id: string, data: UpdateTenantDTO): Promise<boolean> => {
    const success = await handleUpdateTenant(id, data);
    if (success) {
      setIsEditModalOpen(false);
      setEditingTenant(null);
      refetch();
      refreshMetrics();
    }
    return success;
  };

  const handleSuspendTenant = async (tenantId: string): Promise<boolean> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      refetch();
      refreshMetrics();
      return true;
    } catch {
      return false;
    }
  };

  const closeDetails = () => {
    setIsDetailsModalOpen(false);
    setDetailsTenant(null);
  };

  const closeEdit = () => {
    setIsEditModalOpen(false);
    setEditingTenant(null);
  };

  // Calculate summary metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const trialTenants = tenants.filter(t => t.status === 'trial').length;
  const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading tenants...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {creationSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Tenant created successfully! Welcome email has been sent.
          </AlertDescription>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearCreationSuccess}
            className="ml-auto"
          >
            ×
          </Button>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all tenant organizations</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isSubmitting}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || 'An error occurred while loading tenants'}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <OptimizedMetricCard
          title="Total Tenants"
          value={totalTenants}
          icon={Building2}
          gradient="from-blue-400 to-blue-600"
          iconColor="bg-blue-500"
        />
        <OptimizedMetricCard
          title="Active Tenants"
          value={activeTenants}
          icon={CheckCircle}
          gradient="from-green-400 to-green-600"
          iconColor="bg-green-500"
        />
        <OptimizedMetricCard
          title="Trial Tenants"
          value={trialTenants}
          icon={Activity}
          gradient="from-yellow-400 to-yellow-600"
          iconColor="bg-yellow-500"
        />
        <OptimizedMetricCard
          title="Suspended"
          value={suspendedTenants}
          icon={AlertCircle}
          gradient="from-red-400 to-red-600"
          iconColor="bg-red-500"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search tenants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-filter">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="agri_company">Agri Company</SelectItem>
                  <SelectItem value="cooperative">Cooperative</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="view-mode">View Mode</Label>
              <Select 
                value={viewPreferences.mode} 
                onValueChange={(value) => setViewPreferences(prev => ({ ...prev, mode: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small-cards">Small Cards</SelectItem>
                  <SelectItem value="large-cards">Large Cards</SelectItem>
                  <SelectItem value="analytics">Analytics View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Grid */}
      <div className={`grid gap-6 ${
        viewPreferences.mode === 'small-cards' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
        viewPreferences.mode === 'large-cards' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {formattedTenants.map((formattedTenant) => {
          const tenant = tenants.find(t => t.id === formattedTenant.id);
          if (!tenant) return null;

          if (viewPreferences.mode === 'analytics') {
            return (
              <TenantMetricsCard
                key={tenant.id}
                tenant={tenant}
                metrics={tenantMetrics[tenant.id]}
                size={viewPreferences.mode === 'large-cards' ? 'large' : 'small'}
                onEdit={() => handleEditTenant(tenant)}
                onDelete={() => handleSuspendTenant(tenant.id)}
                onViewDetails={() => handleViewDetails(tenant)}
              />
            );
          }

          return (
            <TenantCardRefactored
              key={tenant.id}
              tenant={tenant}
              formattedData={formattedTenant}
              size={viewPreferences.mode === 'large-cards' ? 'large' : 'small'}
              onEdit={() => handleEditTenant(tenant)}
              onDelete={() => handleSuspendTenant(tenant.id)}
              onViewDetails={() => handleViewDetails(tenant)}
              metrics={tenantMetrics[tenant.id]}
              showAnalytics={viewPreferences.mode === 'analytics'}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {tenants.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenants found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType || filterStatus 
                ? 'No tenants match your current filters.' 
                : 'Get started by creating your first tenant.'}
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Tenant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Details Modal with Analytics */}
      <TenantDetailsModalEnhanced
        tenant={detailsTenant}
        formattedData={detailsTenant ? TenantDisplayService.formatTenantForDisplay(detailsTenant) : null}
        isOpen={isDetailsModalOpen}
        onClose={closeDetails}
        onEdit={handleDetailsEdit}
        metrics={detailsTenant ? tenantMetrics[detailsTenant.id] : undefined}
      />

      {/* Enhanced Edit Modal */}
      {editingTenant && (
        <TenantEditModalEnhanced
          tenant={editingTenant}
          isOpen={isEditModalOpen}
          onClose={closeEdit}
          onSave={handleSaveTenant}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Create Tenant Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Create New Tenant
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <TenantForm
              mode="create"
              onSubmit={handleCreateSuccess}
              onCancel={() => setIsCreateModalOpen(false)}
              isSubmitting={isSubmitting}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantManagement;
