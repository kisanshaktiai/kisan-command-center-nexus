
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
import { 
  Building, 
  Users, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  subscription_plan?: string;
  subscription_status?: 'active' | 'trial' | 'expired' | 'cancelled';
  status?: 'active' | 'inactive' | 'suspended';
  is_active: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at?: string;
  branding?: {
    logo_url?: string;
    company_name?: string;
    tagline?: string;
    primary_color?: string;
  };
  user_count?: number;
  last_activity?: string;
}

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  inactiveTenants: number;
  totalUsers: number;
  monthlyRevenue: number;
}

export default function TenantManagement() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch tenants with error handling and data transformation
  const { data: tenants, isLoading: tenantsLoading, refetch: refetchTenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching tenants:', error);
          return [];
        }
        
        // Transform database tenants to match our Tenant interface
        const transformedTenants = (data || []).map(tenant => ({
          id: tenant.id,
          name: tenant.name || 'Unnamed Tenant',
          slug: tenant.slug || '',
          type: tenant.type || 'basic',
          subscription_plan: tenant.subscription_plan || '',
          subscription_status: 'trial' as const, // Default since column doesn't exist
          status: 'active' as const, // Default since column doesn't exist
          is_active: true, // Default since column doesn't exist
          settings: {}, // Default since column doesn't exist
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          branding: {}, // Default since column doesn't exist
          user_count: 0, // Default since column doesn't exist
          last_activity: tenant.updated_at // Use updated_at as proxy
        }));
        
        return transformedTenants;
      } catch (error) {
        console.error('Error in tenants query:', error);
        return [];
      }
    },
  });

  // Fetch tenant statistics with mock data
  const { data: tenantStats } = useQuery({
    queryKey: ['tenant-stats'],
    queryFn: async () => {
      try {
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('*');

        const { data: usersData } = await supabase
          .from('farmers')
          .select('id');

        const safeTenantsData = tenantsData || [];
        const stats: TenantStats = {
          totalTenants: safeTenantsData.length,
          activeTenants: safeTenantsData.length, // Mock since is_active doesn't exist
          trialTenants: Math.floor(safeTenantsData.length / 2), // Mock
          inactiveTenants: 0, // Mock since is_active doesn't exist
          totalUsers: usersData?.length || 0,
          monthlyRevenue: 0 // Mock value
        };

        return stats;
      } catch (error) {
        console.error('Error fetching tenant stats:', error);
        return {
          totalTenants: 0,
          activeTenants: 0,
          trialTenants: 0,
          inactiveTenants: 0,
          totalUsers: 0,
          monthlyRevenue: 0
        };
      }
    },
  });

  const createTenant = async (tenantData: any) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([{
          name: tenantData.name,
          slug: tenantData.slug || tenantData.name.toLowerCase().replace(/\s+/g, '-'),
          type: tenantData.type
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Tenant created successfully');
      setIsCreateDialogOpen(false);
      refetchTenants();
    } catch (error) {
      console.error('Error creating tenant:', error);
      toast.error('Failed to create tenant');
    }
  };

  const updateTenant = async (tenantId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: updates.name,
          slug: updates.slug,
          type: updates.type
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast.success('Tenant updated successfully');
      setIsEditDialogOpen(false);
      setSelectedTenant(null);
      refetchTenants();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
    }
  };

  const deleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (error) throw error;

      toast.success('Tenant deleted successfully');
      refetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('Failed to delete tenant');
    }
  };

  const toggleTenantStatus = async (tenant: Tenant) => {
    // Since is_active doesn't exist in the database, we'll just show a message
    toast.info('Tenant status toggle is not available in the current database schema');
  };

  // Filter tenants based on search and status
  const filteredTenants = tenants?.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && tenant.is_active) ||
      (statusFilter === 'inactive' && !tenant.is_active);
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (tenant: Tenant) => {
    if (tenant.is_active) {
      return <Badge variant="default">Active</Badge>;
    } else {
      return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  const getSubscriptionBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'trial':
        return <Badge variant="outline">Trial</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Trial</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">Manage your platform tenants and their configurations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>Add a new tenant to your platform</DialogDescription>
            </DialogHeader>
            <CreateTenantForm onSubmit={createTenant} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats?.totalTenants || 0}</div>
            <p className="text-xs text-muted-foreground">All registered tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats?.activeTenants || 0}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Tenants</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats?.trialTenants || 0}</div>
            <p className="text-xs text-muted-foreground">On trial period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Across all tenants</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Manage all platform tenants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tenantsLoading ? (
            <div className="text-center py-8">Loading tenants...</div>
          ) : (
            <div className="space-y-4">
              {filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{tenant.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(tenant.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Subscription:</span>
                          {getSubscriptionBadge(tenant.subscription_status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(tenant)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTenantStatus(tenant)}
                      >
                        {tenant.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTenant(tenant.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' ? 'No tenants match your filters' : 'No tenants found'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update tenant information and settings</DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <EditTenantForm 
              tenant={selectedTenant} 
              onSubmit={(updates) => updateTenant(selectedTenant.id, updates)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Tenant Form Component
function CreateTenantForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'basic'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Tenant Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="Auto-generated from name"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="type">Tenant Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button type="submit" className="w-full">Create Tenant</Button>
    </form>
  );
}

// Edit Tenant Form Component
function EditTenantForm({ tenant, onSubmit }: { tenant: Tenant; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: tenant.name,
    slug: tenant.slug || '',
    type: tenant.type || 'basic'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="edit-name">Tenant Name</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit-slug">Slug</Label>
          <Input
            id="edit-slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="edit-type">Tenant Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button type="submit" className="w-full">Update Tenant</Button>
    </form>
  );
}
