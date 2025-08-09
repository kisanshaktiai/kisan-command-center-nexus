import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Building2, Users, Activity, TrendingUp, Grid3X3, List, LayoutGrid, Filter } from "lucide-react";
import { TenantCard } from "@/components/tenant/TenantCard";
import { TenantForm } from "@/components/tenant/TenantForm";
import { TenantFilters } from "@/components/tenant/TenantFilters";
import { TenantViewToggle } from "@/components/tenant/TenantViewToggle";
import { TenantListView } from "@/components/tenant/TenantListView";
import { TenantCreationSuccess } from "@/components/tenant/TenantCreationSuccess";
import { tenantService, ServiceResult } from "@/services/tenantService";
import { Tenant, TenantFilters as TenantFilterType, TenantID } from "@/types/tenant";
import { TenantViewPreferences } from "@/types/tenantView";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TenantManagement = () => {
  // State declarations
  const [tenants, setTenants] = useState<Tenant[] | ServiceResult<Tenant[]>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
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
        setShowCreateModal(false);
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

  const handleDeleteTenant = async (id: string): Promise<void> => {
    if (window.confirm("Are you sure you want to delete this tenant?")) {
      setIsSubmitting(true);
      try {
        const tenantId = id as TenantID;
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

  const renderTenantView = () => {
    if (filteredTenants.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Building2 className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No tenants found</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
              ? "Try adjusting your search or filter criteria"
              : "Get started by creating your first tenant organization"
            }
          </p>
          {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
            <Button onClick={() => setShowCreateModal(true)} size="lg" className="shadow-lg hover:shadow-xl transition-all duration-200">
              <Plus className="mr-2 h-5 w-5" />
              Create First Tenant
            </Button>
          )}
        </div>
      );
    }

    switch (viewPreferences.mode) {
      case 'large-cards':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTenants.map((tenant: Tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onEdit={() => {}}
                onDelete={() => handleDeleteTenant(tenant.id)}
              />
            ))}
          </div>
        );
      case 'list':
        return (
          <TenantListView
            tenants={filteredTenants}
            onEdit={() => {}}
            onDelete={handleDeleteTenant}
            onViewDetails={() => {}}
          />
        );
      case 'small-cards':
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredTenants.map((tenant: Tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onEdit={() => {}}
                onDelete={() => handleDeleteTenant(tenant.id)}
              />
            ))}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-destructive mb-4">⚠️ Error loading tenants</div>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => fetchTenants()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-background via-muted/10 to-background min-h-screen">
      {creationSuccess && (
        <TenantCreationSuccess
          tenantName={creationSuccess.tenantName}
          adminEmail={creationSuccess.adminEmail}
          hasEmailSent={creationSuccess.hasEmailSent}
          onClose={() => setCreationSuccess(null)}
        />
      )}
      
      {/* Enhanced Modern Header with Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border border-primary/10 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 via-transparent to-accent/5"></div>
        <div className="relative p-10">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
                    Tenant Management
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      Enterprise Dashboard
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      v2.0
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Orchestrate and monitor all tenant organizations with advanced controls, real-time insights, and enterprise-grade management tools
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground bg-background/60 rounded-xl px-4 py-3 backdrop-blur-sm border border-border/50 shadow-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Activity className="w-4 h-4" />
                  <span className="font-medium">{getTenantsArray().filter(t => t.status === 'active').length} Active</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground bg-background/60 rounded-xl px-4 py-3 backdrop-blur-sm border border-border/50 shadow-sm">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{getTenantsArray().length} Total</span>
                </div>
              </div>
              
              <Button 
                onClick={() => setShowCreateModal(true)} 
                disabled={isSubmitting}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl hover:shadow-primary/25 transition-all duration-300 group rounded-xl px-8 py-4 text-base font-semibold"
              >
                <Plus className="mr-3 h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
                Create Tenant
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards with Hover Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Total Tenants",
            value: getTenantsArray().length,
            change: "+2 from last month",
            icon: Building2,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/20"
          },
          {
            title: "Active Tenants", 
            value: getTenantsArray().filter(t => t.status === 'active').length,
            change: "Currently active",
            icon: Activity,
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-950/20"
          },
          {
            title: "Trial Tenants",
            value: getTenantsArray().filter(t => t.status === 'trial').length,
            change: "On trial period",
            icon: Users,
            color: "text-orange-600", 
            bg: "bg-orange-50 dark:bg-orange-950/20"
          },
          {
            title: "Growth Rate",
            value: "+12.3%",
            change: "Month over month",
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-950/20"
          }
        ].map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-sm bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Filters and Controls with Modern Design */}
      <Card className="border-0 shadow-xl bg-background/80 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-1">
          <CardContent className="p-8 bg-background/90 backdrop-blur-sm rounded-2xl">
            <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center justify-between">
              {/* Enhanced Search and Filters */}
              <div className="flex flex-col lg:flex-row gap-6 flex-1 max-w-4xl">
                <div className="relative flex-1 min-w-80">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                  <Input
                    placeholder="Search tenants by name, slug, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-4 text-base bg-background/70 border-border/50 focus:border-primary/50 transition-all duration-200 rounded-xl shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
                    >
                      ×
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48 bg-background/70 border-border/50 hover:bg-background/90 transition-colors duration-200 rounded-xl shadow-sm">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="Type" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
                    <SelectTrigger className="w-44 bg-background/70 border-border/50 hover:bg-background/90 transition-colors duration-200 rounded-xl shadow-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Enhanced View Toggle and Stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="outline" className="bg-background/60 backdrop-blur-sm rounded-xl px-3 py-1.5 border-border/50">
                    <span className="font-semibold text-primary">{filteredTenants.length}</span>
                    <span className="ml-1">tenant{filteredTenants.length !== 1 ? 's' : ''}</span>
                  </Badge>
                </div>
                
                <TenantViewToggle 
                  preferences={viewPreferences}
                  onPreferencesChange={setViewPreferences}
                  totalCount={filteredTenants.length}
                />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Enhanced Tenant View with Modern Layouts */}
      <div className="min-h-[500px] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Organizations</h2>
            {viewPreferences.mode !== 'list' && (
              <Badge variant="secondary" className="text-xs">
                {viewPreferences.mode === 'large-cards' ? 'Large Cards' : 'Compact Cards'} View
              </Badge>
            )}
          </div>
        </div>
        
        <div className="relative">
          {renderTenantView()}
        </div>
      </div>

      {/* Enhanced Create Tenant Modal with Modern Design */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0 bg-background/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl">
          {/* Modern Header with Gradient */}
          <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 p-8 border-b border-border/50">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
            <DialogHeader className="relative">
              <DialogTitle className="text-3xl font-bold flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                  <Plus className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    Create New Tenant
                  </span>
                  <p className="text-base font-normal text-muted-foreground mt-2 leading-relaxed">
                    Set up a new tenant organization with customized settings, limits, and branding options
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
          
          {/* Form Content with Enhanced Styling */}
          <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)] bg-gradient-to-br from-background via-muted/5 to-background">
            <TenantForm
              mode="create"
              onSubmit={handleCreateTenant}
              onCancel={() => setShowCreateModal(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantManagement;
