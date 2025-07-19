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
  AlertCircle,
  Calendar,
  Globe,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  status?: 'trial' | 'active' | 'suspended' | 'expired';
  subscription_plan?: string;
  subscription_status?: 'active' | 'trial' | 'expired' | 'cancelled';
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
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: any;
  established_date?: string;
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  subdomain?: string;
  custom_domain?: string;
  trial_ends_at?: string;
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
          status: (tenant.status === 'cancelled' ? 'expired' : tenant.status) as 'trial' | 'active' | 'suspended' | 'expired' || 'trial',
          subscription_plan: tenant.subscription_plan || 'starter',
          subscription_status: (tenant.status === 'active' ? 'active' : 'trial') as 'active' | 'trial' | 'expired' | 'cancelled',
          is_active: tenant.status === 'active',
          settings: tenant.settings || {},
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          branding: {},
          user_count: 0,
          last_activity: tenant.updated_at,
          owner_name: tenant.owner_name,
          owner_email: tenant.owner_email,
          owner_phone: tenant.owner_phone,
          business_registration: tenant.business_registration,
          business_address: tenant.business_address,
          established_date: tenant.established_date,
          max_farmers: tenant.max_farmers,
          max_dealers: tenant.max_dealers,
          max_products: tenant.max_products,
          max_storage_gb: tenant.max_storage_gb,
          max_api_calls_per_day: tenant.max_api_calls_per_day,
          subdomain: tenant.subdomain,
          custom_domain: tenant.custom_domain,
          trial_ends_at: tenant.trial_ends_at
        }));
        
        return transformedTenants;
      } catch (error) {
        console.error('Error in tenants query:', error);
        return [];
      }
    },
  });

  // Fetch tenant statistics
  const { data: tenantStats } = useQuery({
    queryKey: ['tenant-stats'],
    queryFn: async () => {
      try {
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('status');

        const { data: usersData } = await supabase
          .from('farmers')
          .select('id');

        const safeTenantsData = tenantsData || [];
        const activeCount = safeTenantsData.filter(t => t.status === 'active').length;
        const trialCount = safeTenantsData.filter(t => t.status === 'trial').length;
        
        const stats: TenantStats = {
          totalTenants: safeTenantsData.length,
          activeTenants: activeCount,
          trialTenants: trialCount,
          inactiveTenants: safeTenantsData.length - activeCount - trialCount,
          totalUsers: usersData?.length || 0,
          monthlyRevenue: activeCount * 99 // Mock calculation
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
        .insert([tenantData])
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
        .update(updates)
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

  // Filter tenants based on search and status
  const filteredTenants = tenants?.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && tenant.status === 'active') ||
      (statusFilter === 'trial' && tenant.status === 'trial') ||
      (statusFilter === 'suspended' && tenant.status === 'suspended');
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'trial':
        return <Badge variant="outline">Trial</Badge>;
      case 'suspended':
        return <Badge variant="secondary">Suspended</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>Add a new tenant to your platform</DialogDescription>
            </DialogHeader>
            <CreateTenantForm onSubmit={createTenant} onCancel={() => setIsCreateDialogOpen(false)} />
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
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
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
                          <span className="text-xs text-muted-foreground">Plan:</span>
                          <Badge variant="outline">{tenant.subscription_plan}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(tenant.status)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update tenant information and settings</DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <EditTenantForm 
              tenant={selectedTenant} 
              onSubmit={(updates) => updateTenant(selectedTenant.id, updates)}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Tenant Form Component
function CreateTenantForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    slug: '',
    type: 'basic',
    
    // Owner Information
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    
    // Business Information
    business_registration: '',
    business_address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postal_code: ''
    },
    established_date: '',
    
    // Subscription & Limits
    subscription_plan: 'starter',
    max_farmers: 1000,
    max_dealers: 50,
    max_products: 100,
    max_storage_gb: 10,
    max_api_calls_per_day: 10000,
    
    // Domain Configuration
    subdomain: '',
    custom_domain: '',
    
    // Additional Settings
    metadata: {},
    settings: {}
  });

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug === '' ? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : prev.slug
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="owner">Owner</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="limits">Limits & Domain</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">
                <Building className="w-4 h-4 inline mr-1" />
                Tenant Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter tenant name"
                required
              />
            </div>
            <div>
              <Label htmlFor="slug">
                <Globe className="w-4 h-4 inline mr-1" />
                Slug *
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="tenant-slug"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Used for URLs and identification</p>
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
        </TabsContent>

        <TabsContent value="owner" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="owner_name">
                <User className="w-4 h-4 inline mr-1" />
                Owner Name *
              </Label>
              <Input
                id="owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="owner_email">
                <Mail className="w-4 h-4 inline mr-1" />
                Owner Email *
              </Label>
              <Input
                id="owner_email"
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="owner_phone">
              <Phone className="w-4 h-4 inline mr-1" />
              Owner Phone
            </Label>
            <Input
              id="owner_phone"
              value={formData.owner_phone}
              onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="business_registration">Business Registration</Label>
              <Input
                id="business_registration"
                value={formData.business_registration}
                onChange={(e) => setFormData({ ...formData, business_registration: e.target.value })}
                placeholder="Business registration number"
              />
            </div>
            <div>
              <Label htmlFor="established_date">
                <Calendar className="w-4 h-4 inline mr-1" />
                Established Date
              </Label>
              <Input
                id="established_date"
                type="date"
                value={formData.established_date}
                onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label>
              <MapPin className="w-4 h-4 inline mr-1" />
              Business Address
            </Label>
            <div className="grid gap-2 mt-2">
              <Input
                placeholder="Street Address"
                value={formData.business_address.street}
                onChange={(e) => setFormData({
                  ...formData,
                  business_address: { ...formData.business_address, street: e.target.value }
                })}
              />
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="City"
                  value={formData.business_address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    business_address: { ...formData.business_address, city: e.target.value }
                  })}
                />
                <Input
                  placeholder="State/Province"
                  value={formData.business_address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    business_address: { ...formData.business_address, state: e.target.value }
                  })}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Country"
                  value={formData.business_address.country}
                  onChange={(e) => setFormData({
                    ...formData,
                    business_address: { ...formData.business_address, country: e.target.value }
                  })}
                />
                <Input
                  placeholder="Postal Code"
                  value={formData.business_address.postal_code}
                  onChange={(e) => setFormData({
                    ...formData,
                    business_address: { ...formData.business_address, postal_code: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <div>
            <Label htmlFor="subscription_plan">
              <CreditCard className="w-4 h-4 inline mr-1" />
              Subscription Plan
            </Label>
            <Select value={formData.subscription_plan} onValueChange={(value) => setFormData({ ...formData, subscription_plan: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="max_farmers">Max Farmers</Label>
              <Input
                id="max_farmers"
                type="number"
                value={formData.max_farmers}
                onChange={(e) => setFormData({ ...formData, max_farmers: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="max_dealers">Max Dealers</Label>
              <Input
                id="max_dealers"
                type="number"
                value={formData.max_dealers}
                onChange={(e) => setFormData({ ...formData, max_dealers: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="max_products">Max Products</Label>
              <Input
                id="max_products"
                type="number"
                value={formData.max_products}
                onChange={(e) => setFormData({ ...formData, max_products: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="max_storage_gb">Max Storage (GB)</Label>
              <Input
                id="max_storage_gb"
                type="number"
                value={formData.max_storage_gb}
                onChange={(e) => setFormData({ ...formData, max_storage_gb: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="max_api_calls_per_day">Max API Calls per Day</Label>
            <Input
              id="max_api_calls_per_day"
              type="number"
              value={formData.max_api_calls_per_day}
              onChange={(e) => setFormData({ ...formData, max_api_calls_per_day: parseInt(e.target.value) })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={formData.subdomain}
                onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                placeholder="tenant-name"
              />
              <p className="text-xs text-muted-foreground mt-1">Will be: tenant-name.yourdomain.com</p>
            </div>
            <div>
              <Label htmlFor="custom_domain">Custom Domain</Label>
              <Input
                id="custom_domain"
                value={formData.custom_domain}
                onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                placeholder="www.tenant-domain.com"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="min-w-[120px]">
          Create Tenant
        </Button>
      </div>
    </form>
  );
}

// Edit Tenant Form Component
function EditTenantForm({ tenant, onSubmit, onCancel }: { tenant: Tenant; onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: tenant.name,
    slug: tenant.slug || '',
    type: tenant.type || 'basic',
    status: (tenant.status === 'cancelled' ? 'expired' : tenant.status) as 'trial' | 'active' | 'suspended' | 'expired' || 'trial',
    owner_name: tenant.owner_name || '',
    owner_email: tenant.owner_email || '',
    owner_phone: tenant.owner_phone || '',
    business_registration: tenant.business_registration || '',
    business_address: tenant.business_address || {},
    established_date: tenant.established_date || '',
    subscription_plan: tenant.subscription_plan || 'starter',
    max_farmers: tenant.max_farmers || 1000,
    max_dealers: tenant.max_dealers || 50,
    max_products: tenant.max_products || 100,
    max_storage_gb: tenant.max_storage_gb || 10,
    max_api_calls_per_day: tenant.max_api_calls_per_day || 10000,
    subdomain: tenant.subdomain || '',
    custom_domain: tenant.custom_domain || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="owner">Owner</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="limits">Limits & Domain</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
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
          
          <div className="grid gap-4 md:grid-cols-2">
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
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as 'trial' | 'active' | 'suspended' | 'expired' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="owner" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="edit-owner_name">Owner Name</Label>
              <Input
                id="edit-owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-owner_email">Owner Email</Label>
              <Input
                id="edit-owner_email"
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <div>
            <Label htmlFor="edit-business_registration">Business Registration</Label>
            <Input
              id="edit-business_registration"
              value={formData.business_registration}
              onChange={(e) => setFormData({ ...formData, business_registration: e.target.value })}
            />
          </div>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="edit-max_farmers">Max Farmers</Label>
              <Input
                id="edit-max_farmers"
                type="number"
                value={formData.max_farmers}
                onChange={(e) => setFormData({ ...formData, max_farmers: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="edit-max_dealers">Max Dealers</Label>
              <Input
                id="edit-max_dealers"
                type="number"
                value={formData.max_dealers}
                onChange={(e) => setFormData({ ...formData, max_dealers: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="min-w-[120px]">
          Update Tenant
        </Button>
      </div>
    </form>
  );
}
