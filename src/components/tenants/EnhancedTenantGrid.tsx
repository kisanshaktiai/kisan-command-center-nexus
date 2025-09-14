
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiFactory } from '@/services/ApiFactory';
import { RBACGuard } from '@/components/rbac/RBACGuard';
import { UserRole, Permission } from '@/services/EnhancedRBACService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit,
  Eye,
  Building2,
  Users,
  Calendar,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface TenantGridItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'archived';
  subscription_plan: string;
  created_at: string;
  updated_at: string;
  owner_name: string;
  owner_email: string;
  user_count?: number;
  last_activity?: string;
  subscription_end_date?: string;
  branding?: {
    logo_url?: string;
    primary_color?: string;
  };
}

const statusColors = {
  trial: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-800',
};

const typeLabels = {
  agri_company: 'Agriculture Company',
  dealer: 'Dealer',
  ngo: 'NGO',
  government: 'Government',
  university: 'University',
  sugar_factory: 'Sugar Factory',
  cooperative: 'Cooperative',
  insurance: 'Insurance',
};

export const EnhancedTenantGrid: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch tenants data
  const { data: tenants = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tenants', { search: searchTerm, status: statusFilter, type: typeFilter }],
    queryFn: async () => {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const response = await ApiFactory.get<TenantGridItem[]>('tenants', params);
      return response.data || [];
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Filter and sort tenants
  const filteredAndSortedTenants = useMemo(() => {
    let filtered = tenants.filter(tenant => {
      const matchesSearch = !searchTerm || 
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      const matchesType = typeFilter === 'all' || tenant.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof TenantGridItem] as string;
      const bValue = b[sortBy as keyof TenantGridItem] as string;
      
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  }, [tenants, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTenants(filteredAndSortedTenants.map(t => t.id));
    } else {
      setSelectedTenants([]);
    }
  };

  const handleSelectTenant = (tenantId: string, checked: boolean) => {
    if (checked) {
      setSelectedTenants(prev => [...prev, tenantId]);
    } else {
      setSelectedTenants(prev => prev.filter(id => id !== tenantId));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedTenants.length === 0) return;

    try {
      switch (action) {
        case 'export':
          // Export selected tenants
          console.log('Exporting tenants:', selectedTenants);
          break;
        case 'delete':
          // Bulk delete confirmation
          if (confirm(`Are you sure you want to delete ${selectedTenants.length} tenant(s)?`)) {
            // TODO: Implement bulk delete
            console.log('Deleting tenants:', selectedTenants);
          }
          break;
        case 'suspend':
          // Bulk suspend
          console.log('Suspending tenants:', selectedTenants);
          break;
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const TenantActions: React.FC<{ tenant: TenantGridItem }> = ({ tenant }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <RBACGuard permissions={[Permission.TENANT_READ]} showError={false}>
          <DropdownMenuItem>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        </RBACGuard>
        <RBACGuard permissions={[Permission.TENANT_UPDATE]} showError={false}>
          <DropdownMenuItem>
            <Edit className="mr-2 h-4 w-4" />
            Edit Tenant
          </DropdownMenuItem>
        </RBACGuard>
        <DropdownMenuSeparator />
        <RBACGuard permissions={[Permission.TENANT_DELETE]} showError={false}>
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Tenant
          </DropdownMenuItem>
        </RBACGuard>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <RBACGuard permissions={[Permission.TENANT_READ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tenant Management</h1>
            <p className="text-muted-foreground">
              Manage and monitor all tenants across the platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RBACGuard permissions={[Permission.TENANT_CREATE]} showError={false}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </RBACGuard>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter tenants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedTenants.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedTenants.length} tenant(s) selected
                </span>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <RBACGuard permissions={[Permission.TENANT_DELETE]} showError={false}>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </RBACGuard>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTenants.length === filteredAndSortedTenants.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTenants.includes(tenant.id)}
                          onCheckedChange={(checked) => handleSelectTenant(tenant.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {tenant.branding?.logo_url ? (
                              <AvatarImage src={tenant.branding.logo_url} />
                            ) : (
                              <AvatarFallback>
                                <Building2 className="h-4 w-4" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {tenant.owner_email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {typeLabels[tenant.type as keyof typeof typeLabels] || tenant.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[tenant.status]}>
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {tenant.subscription_plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{tenant.user_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(tenant.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.last_activity ? (
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(tenant.last_activity), 'MMM d')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TenantActions tenant={tenant} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants.filter(t => t.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants.filter(t => t.status === 'trial').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenants.reduce((sum, t) => sum + (t.user_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RBACGuard>
  );
};
