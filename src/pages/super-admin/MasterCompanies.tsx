import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CompanyCard } from '@/components/super-admin/companies/CompanyCard';
import { CompanyQuickView } from '@/components/super-admin/companies/CompanyQuickView';
import { CompanyFormWizard } from '@/components/super-admin/companies/CompanyFormWizard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Grid3x3, 
  List,
  Download,
  Upload,
  Filter,
  Building,
  CheckCircle,
  AlertCircle,
  Users,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MasterCompany {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: any;
  gst_number: string | null;
  pan_number: string | null;
  certifications: any[];
  status: 'active' | 'inactive' | 'pending' | 'verified';
  is_potential_tenant: boolean;
  converted_to_tenant: boolean;
  tenant_id: string | null;
  is_ai_recommendable: boolean;
  established_date: string | null;
  annual_revenue: number | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

const MasterCompanies: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<MasterCompany | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const queryClient = useQueryClient();

  // Fetch master companies
  const { data: companies = [], isLoading, refetch } = useQuery({
    queryKey: ['master-companies', statusFilter, typeFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('master_companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map company_type to type for consistency
      const mappedData = (data || []).map((company: any) => ({
        ...company,
        type: company.company_type || company.type || 'other',
        is_ai_recommendable: company.is_ai_recommendable ?? true,
      }));
      
      return mappedData as MasterCompany[];
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter(c => c.status === 'active').length;
    const verified = companies.filter(c => c.status === 'verified').length;
    const potential = companies.filter(c => c.is_potential_tenant).length;
    
    return { total, active, verified, potential };
  }, [companies]);

  // Paginated companies
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return companies.slice(startIndex, endIndex);
  }, [companies, currentPage]);

  const totalPages = Math.ceil(companies.length / itemsPerPage);

  // Add/Update company mutation
  const saveCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      // Map type to company_type for database
      const dbData = {
        ...data,
        company_type: data.type,
        address: data.address || {},
        certifications: data.certifications || [],
        metadata: data.metadata || {},
      };
      delete dbData.type; // Remove type field as database uses company_type

      if (selectedCompany) {
        const { error } = await supabase
          .from('master_companies')
          .update(dbData)
          .eq('id', selectedCompany.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('master_companies')
          .insert(dbData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      toast.success(selectedCompany ? 'Company updated successfully' : 'Company added successfully');
      setIsFormOpen(false);
      setSelectedCompany(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save company');
    },
  });

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('master_companies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      toast.success('Company deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete company');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('master_companies')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      toast.success('Companies deleted successfully');
      setSelectedCompanies([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete companies');
    },
  });

  // Convert to tenant mutation
  const convertToTenantMutation = useMutation({
    mutationFn: async (company: MasterCompany) => {
      // This would trigger the actual tenant creation process
      const { error } = await supabase
        .from('master_companies')
        .update({ converted_to_tenant: true })
        .eq('id', company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      toast.success('Company marked for tenant conversion');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to convert to tenant');
    },
  });

  const handleEdit = (company: MasterCompany) => {
    setSelectedCompany(company);
    setIsFormOpen(true);
  };

  const handleView = (company: MasterCompany) => {
    setSelectedCompany(company);
    setIsQuickViewOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      deleteCompanyMutation.mutate(id);
    }
  };

  const handleSelectCompany = (id: string) => {
    setSelectedCompanies(prev => 
      prev.includes(id) 
        ? prev.filter(cId => cId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCompanies.length === paginatedCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(paginatedCompanies.map(c => c.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedCompanies.length === 0) {
      toast.error('No companies selected');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${selectedCompanies.length} companies?`)) {
      bulkDeleteMutation.mutate(selectedCompanies);
    }
  };

  const handleExport = () => {
    // Convert companies to CSV
    const csv = [
      ['Name', 'Slug', 'Type', 'Email', 'Phone', 'Status', 'GST', 'PAN'],
      ...companies.map(c => [
        c.name,
        c.slug,
        c.type,
        c.email || '',
        c.phone || '',
        c.status,
        c.gst_number || '',
        c.pan_number || ''
      ])
    ].map(row => row.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `companies-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Companies exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background p-8">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Master Companies
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage agriculture companies for AI suggestions and tenant conversion
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {selectedCompanies.length > 0 && (
                    <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected ({selectedCompanies.length})
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => { setSelectedCompany(null); setIsFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-primary/20 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Companies</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-emerald-500/20 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <p className="text-2xl font-bold">{stats.verified}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-500/20 bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Potential Tenants</p>
                    <p className="text-2xl font-bold">{stats.potential}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
                <SelectItem value="retailer">Retailer</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="service_provider">Service Provider</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies View */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No companies found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by adding your first company.'}
            </p>
            <Button onClick={() => { setSelectedCompany(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Company
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedCompanies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onConvertToTenant={() => convertToTenantMutation.mutate(company)}
                isSelected={selectedCompanies.includes(company.id)}
                onSelect={handleSelectCompany}
              />
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCompanies.length === paginatedCompanies.length && paginatedCompanies.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Potential Tenant</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCompanies.includes(company.id)}
                        onCheckedChange={() => handleSelectCompany(company.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{company.name}</div>
                          <div className="text-sm text-muted-foreground">{company.slug}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{company.type}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {company.email && <div>{company.email}</div>}
                        {company.phone && <div>{company.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        company.status === 'active' ? 'default' :
                        company.status === 'verified' ? 'success' :
                        company.status === 'inactive' ? 'secondary' :
                        'outline'
                      }>
                        {company.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {company.converted_to_tenant ? (
                        <Badge variant="success">Converted</Badge>
                      ) : company.is_potential_tenant ? (
                        <Badge variant="outline">Potential</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(company)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(company)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(company.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {company.is_potential_tenant && !company.converted_to_tenant && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => convertToTenantMutation.mutate(company)}
                            title="Convert to Tenant"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, companies.length)} of {companies.length} companies
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="px-2">...</span>}
            {totalPages > 5 && (
              <Button
                variant={currentPage === totalPages ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Form Wizard */}
      <CompanyFormWizard
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCompany(null);
        }}
        onSubmit={(data) => saveCompanyMutation.mutate(data)}
        initialData={selectedCompany}
        isEditing={!!selectedCompany}
      />

      {/* Quick View */}
      <CompanyQuickView
        company={selectedCompany}
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setSelectedCompany(null);
        }}
        onEdit={handleEdit}
        onConvertToTenant={() => selectedCompany && convertToTenantMutation.mutate(selectedCompany)}
      />
    </div>
  );
};

export default MasterCompanies;