
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Building, Search, Plus, Filter } from 'lucide-react';
import { useTenantManagement } from '@/hooks/useTenantManagement';
import { TenantCardRefactured } from '@/components/tenant/TenantCardRefactored';
import { TenantForm } from '@/components/tenant/TenantForm';
import { TenantListView } from '@/components/tenant/TenantListView';
import { OptimizedMetricCard } from '@/components/ui/optimized-metric-card';
import { TenantDisplayService } from '@/services/TenantDisplayService';

export default function TenantManagement() {
  const {
    tenants,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    viewMode,
    setViewMode,
    showCreateForm,
    setShowCreateForm,
    selectedTenant,
    setSelectedTenant,
    handleCreateTenant,
    handleUpdateTenant,
    handleDeleteTenant,
    filteredTenants,
    tenantStats
  } = useTenantManagement();

  const handleViewDetails = (tenant: any) => {
    console.log('View details for tenant:', tenant.id);
    // For now, just edit the tenant
    setSelectedTenant(tenant);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tenants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">Error loading tenants: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage organizations and their configurations
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <OptimizedMetricCard
          title="Total Tenants"
          value={tenantStats.total}
          icon={Building}
          gradient="from-blue-600 to-purple-600"
          iconColor="bg-blue-600"
          textColor="white"
        />
        <OptimizedMetricCard
          title="Active"
          value={tenantStats.active}
          icon={Building}
          gradient="from-green-500 to-emerald-600"
          iconColor="bg-green-600"
          textColor="white"
        />
        <OptimizedMetricCard
          title="Trial"
          value={tenantStats.trial}
          icon={Building}
          gradient="from-orange-500 to-red-500"
          iconColor="bg-orange-600"
          textColor="white"
        />
        <OptimizedMetricCard
          title="Suspended"
          value={tenantStats.suspended}
          icon={Building}
          gradient="from-red-500 to-pink-600"
          iconColor="bg-red-600"
          textColor="white"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="agri_company">Agricultural Company</SelectItem>
            <SelectItem value="dealer">Dealer</SelectItem>
            <SelectItem value="ngo">NGO</SelectItem>
            <SelectItem value="government">Government</SelectItem>
            <SelectItem value="university">University</SelectItem>
            <SelectItem value="sugar_factory">Sugar Factory</SelectItem>
            <SelectItem value="cooperative">Cooperative</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'list')}>
        <TabsList>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map((tenant) => (
              <TenantCardRefactured
                key={tenant.id}
                tenant={tenant}
                formattedData={TenantDisplayService.formatTenantForDisplay(tenant)}
                size="small"
                onEdit={() => setSelectedTenant(tenant)}
                onDelete={() => handleDeleteTenant(tenant.id)}
                onViewDetails={() => handleViewDetails(tenant)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <TenantListView
            tenants={filteredTenants}
            onEdit={setSelectedTenant}
            onDelete={async (tenantId: string) => {
              await handleDeleteTenant(tenantId);
            }}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Form */}
      {(showCreateForm || selectedTenant) && (
        <TenantForm
          initialData={selectedTenant || undefined}
          onSave={selectedTenant ? (data: any) => handleUpdateTenant(selectedTenant) : handleCreateTenant}
          onCancel={() => {
            setShowCreateForm(false);
            setSelectedTenant(null);
          }}
        />
      )}
    </div>
  );
}
