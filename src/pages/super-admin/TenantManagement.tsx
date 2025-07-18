import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Users, 
  Database,
  Activity,
  DollarSign,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TenantManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newTenantOpen, setNewTenantOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get all tenants from the existing tenants table
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['super-admin-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tenants:', error);
        throw error;
      }
      return data;
    },
  });

  // Create new tenant
  const createTenantMutation = useMutation({
    mutationFn: async (tenantData: any) => {
      console.log('Creating tenant with data:', tenantData);
      
      // Create the tenant first
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert([{
          name: tenantData.name,
          slug: tenantData.slug,
          type: tenantData.type,
          status: tenantData.status,
          settings: {
            owner_name: tenantData.owner_name,
            owner_email: tenantData.owner_email,
            owner_phone: tenantData.owner_phone,
          }
        }])
        .select()
        .single();
      
      if (tenantError) {
        console.error('Error creating tenant:', tenantError);
        throw tenantError;
      }
      
      console.log('Tenant created successfully:', tenant);
      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      setNewTenantOpen(false);
      toast.success('Tenant created successfully');
    },
    onError: (error: any) => {
      console.error('Create tenant error:', error);
      toast.error('Failed to create tenant: ' + (error.message || 'Unknown error'));
    },
  });

  const filteredTenants = tenants?.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'suspended':
        return 'secondary';
      case 'inactive':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTenantTypeColor = (type: string) => {
    switch (type) {
      case 'agri_company':
        return 'bg-purple-100 text-purple-800';
      case 'dealer':
        return 'bg-blue-100 text-blue-800';
      case 'ngo':
        return 'bg-green-100 text-green-800';
      case 'government':
        return 'bg-orange-100 text-orange-800';
      case 'university':
        return 'bg-indigo-100 text-indigo-800';
      case 'sugar_factory':
        return 'bg-yellow-100 text-yellow-800';
      case 'cooperative':
        return 'bg-pink-100 text-pink-800';
      case 'insurance':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTenantTypeLabel = (type: string) => {
    switch (type) {
      case 'agri_company':
        return 'Agriculture Company';
      case 'dealer':
        return 'Dealer';
      case 'ngo':
        return 'NGO';
      case 'government':
        return 'Government';
      case 'university':
        return 'University';
      case 'sugar_factory':
        return 'Sugar Factory';
      case 'cooperative':
        return 'Cooperative';
      case 'insurance':
        return 'Insurance';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage all tenants and their configurations
          </p>
        </div>
        
        <Dialog open={newTenantOpen} onOpenChange={setNewTenantOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Add a new tenant to the platform
              </DialogDescription>
            </DialogHeader>
            <TenantForm 
              onSubmit={(data) => createTenantMutation.mutate(data)}
              isLoading={createTenantMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants?.filter(t => t.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agriculture Companies</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants?.filter(t => t.type === 'agri_company').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$127,439</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            View and manage all platform tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading tenants...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants?.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {tenant.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTenantTypeColor(tenant.type)}>
                        {getTenantTypeLabel(tenant.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.subscription_plan || 'Free'}
                    </TableCell>
                    <TableCell>
                      0 {/* This would come from user_tenants count */}
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const TenantForm = ({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'agri_company',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    status: 'active'
  });

  // Function to generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim('-'); // Remove leading/trailing hyphens
  };

  // Handle name change and auto-generate slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = generateSlug(name);
    
    setFormData({ 
      ...formData, 
      name,
      slug
    });
  };

  // Handle manual slug change
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = generateSlug(e.target.value);
    setFormData({ ...formData, slug });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Tenant name is required');
      return;
    }
    
    if (!formData.slug.trim()) {
      toast.error('Tenant slug is required');
      return;
    }
    
    if (!formData.owner_name.trim()) {
      toast.error('Owner name is required');
      return;
    }
    
    if (!formData.owner_email.trim()) {
      toast.error('Owner email is required');
      return;
    }

    console.log('Submitting form data:', formData);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Tenant Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={handleNameChange}
          placeholder="Enter tenant name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={handleSlugChange}
          placeholder="tenant-slug"
          required
        />
        <p className="text-xs text-muted-foreground">
          Auto-generated from tenant name. Edit if needed.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tenant Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agri_company">Agriculture Company</SelectItem>
            <SelectItem value="dealer">Dealer</SelectItem>
            <SelectItem value="ngo">NGO</SelectItem>
            <SelectItem value="government">Government</SelectItem>
            <SelectItem value="university">University</SelectItem>
            <SelectItem value="sugar_factory">Sugar Factory</SelectItem>
            <SelectItem value="cooperative">Cooperative</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_name">Owner Name</Label>
        <Input
          id="owner_name"
          value={formData.owner_name}
          onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
          placeholder="Owner full name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_email">Owner Email</Label>
        <Input
          id="owner_email"
          type="email"
          value={formData.owner_email}
          onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
          placeholder="owner@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_phone">Owner Phone (Optional)</Label>
        <Input
          id="owner_phone"
          type="tel"
          value={formData.owner_phone}
          onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
          placeholder="+1234567890"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Tenant'}
      </Button>
    </form>
  );
};

export default TenantManagement;
