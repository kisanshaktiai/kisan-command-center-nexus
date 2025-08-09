
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Building2, Users, Activity, TrendingUp } from "lucide-react";
import { TenantCard } from "@/components/tenant/TenantCard";
import { TenantForm } from "@/components/tenant/TenantForm";
import { TenantFilters } from "@/components/tenant/TenantFilters";
import { TenantViewToggle } from "@/components/tenant/TenantViewToggle";
import { TenantListView } from "@/components/tenant/TenantListView";
import { TenantCreationSuccess } from "@/components/tenant/TenantCreationSuccess";
import { tenantService, ServiceResult } from "@/services/tenantService";
import { Tenant, TenantFilters as TenantFilterType, createTenantID } from "@/types/tenant";
import { TenantViewPreferences } from "@/types/tenantView";
import { toast } from "sonner";

const TenantManagement = () => {
  // State declarations
  const [tenants, setTenants] = useState<Tenant[] | ServiceResult<Tenant[]>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState<any>(null);
  const [viewPreferences, setViewPreferences] = useState<TenantViewPreferences>({
    mode: 'small-cards',
    density: 'comfortable',
    sortBy: 'created_at',
    sortOrder: 'desc',
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

  // Helper function to get tenants array with proper type checking
  const getTenantsArray = (): Tenant[] => {
    if (Array.isArray(tenants)) {
      return tenants;
    }
    // If tenants is a ServiceResult, extract the data array
    if (tenants && typeof tenants === 'object' && 'data' in tenants && tenants.success) {
      return Array.isArray(tenants.data) ? tenants.data : [];
    }
    return [];
  };

  const fetchTenants = async (filters?: TenantFilterType) => {
    setLoading(true);
    setError(null);
    try {
      const result = await tenantService.getTenants(filters);
      setTenants(result);
    } catch (err: any) {
      console.error('Error fetching tenants:', err);
      setError(err.message || 'Failed to fetch tenants');
      toast.error('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (data: any): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const result = await tenantService.createTenant(data);
      if (result.success) {
        toast.success("Tenant created successfully");
        setCreationSuccess({
          tenantName: data.name,
          adminEmail: data.owner_email,
          hasEmailSent: true
        });
        setShowForm(false);
        fetchTenants(); // Refresh tenant list
        return true;
      } else {
        toast.error(result.error || "Failed to create tenant");
        return false;
      }
    } catch (err: any) {
      console.error('Error creating tenant:', err);
      toast.error(err.message || "Failed to create tenant");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTenant = async (id: string, data: any) => {
    setIsSubmitting(true);
    try {
      const tenantId = createTenantID(id);
      const result = await tenantService.updateTenant(tenantId, data);
      if (result.success) {
        toast.success("Tenant updated successfully");
        fetchTenants(); // Refresh tenant list
      } else {
        toast.error(result.error || "Failed to update tenant");
      }
    } catch (err: any) {
      console.error('Error updating tenant:', err);
      toast.error(err.message || "Failed to update tenant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (id: string): Promise<void> => {
    if (window.confirm("Are you sure you want to delete this tenant?")) {
      setIsSubmitting(true);
      try {
        const tenantId = createTenantID(id);
        const result = await tenantService.deleteTenant(tenantId);
        if (result.success) {
          toast.success("Tenant deleted successfully");
          fetchTenants(); // Refresh tenant list
        } else {
          toast.error(result.error || "Failed to delete tenant");
        }
      } catch (err: any) {
        console.error('Error deleting tenant:', err);
        toast.error(err.message || "Failed to delete tenant");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const filteredTenants = getTenantsArray().filter((tenant: Tenant) => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tenant.owner_email && tenant.owner_email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || tenant.type === filterType;
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return <div>Loading tenants...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {creationSuccess && (
        <TenantCreationSuccess
          tenantName={creationSuccess.tenantName}
          adminEmail={creationSuccess.adminEmail}
          hasEmailSent={creationSuccess.hasEmailSent}
          onClose={() => setCreationSuccess(null)}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tenant Management</h2>
          <p className="text-muted-foreground">
            Manage tenant organizations and their subscriptions
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={isSubmitting}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tenant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTenantsArray().length}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getTenantsArray().filter(t => t.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getTenantsArray().filter(t => t.status === 'trial').length}
            </div>
            <p className="text-xs text-muted-foreground">
              On trial period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12.3%</div>
            <p className="text-xs text-muted-foreground">
              Month over month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="agri_company">Agri Company</SelectItem>
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TenantViewToggle 
          currentView={viewMode} 
          onViewChange={setViewMode} 
        />
      </div>

      {/* Tenant Grid or List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTenants.map((tenant: Tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onEdit={() => {}}
              onDelete={() => handleDeleteTenant(tenant.id)}
            />
          ))}
        </div>
      ) : (
        <TenantListView
          tenants={filteredTenants}
          onEdit={() => {}}
          onDelete={handleDeleteTenant}
          onViewDetails={() => {}}
        />
      )}

      {/* Tenant Form Modal */}
      {showForm && (
        <TenantForm
          open={showForm}
          onOpenChange={setShowForm}
          onSubmit={handleCreateTenant}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default TenantManagement;
