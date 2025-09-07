import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Filter, Building, Edit, Trash2, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface MasterCompany {
  id: string;
  name: string;
  slug: string;
  company_type: string;
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
  metadata: any;
  created_at: string;
  updated_at: string;
}

export default function MasterCompanies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<MasterCompany | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    company_type: 'manufacturer',
    description: '',
    website: '',
    email: '',
    phone: '',
    gst_number: '',
    pan_number: '',
    status: 'pending' as const,
    is_potential_tenant: true,
  });

  const queryClient = useQueryClient();

  // Fetch master companies
  const { data: companies, isLoading } = useQuery({
    queryKey: ['master-companies', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('master_companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MasterCompany[];
    },
  });

  // Add company mutation
  const addCompanyMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('master_companies').insert({
        ...data,
        address: {},
        certifications: [],
        metadata: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      toast.success('Company added successfully');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add company');
    },
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('master_companies')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-companies'] });
      toast.success('Company updated successfully');
      setIsEditModalOpen(false);
      setSelectedCompany(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update company');
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

  // Convert to tenant mutation
  const convertToTenantMutation = useMutation({
    mutationFn: async (companyId: string) => {
      // This would trigger the actual tenant creation process
      // For now, we'll just update the flag
      const { error } = await supabase
        .from('master_companies')
        .update({ converted_to_tenant: true })
        .eq('id', companyId);
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

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      company_type: 'manufacturer',
      description: '',
      website: '',
      email: '',
      phone: '',
      gst_number: '',
      pan_number: '',
      status: 'pending',
      is_potential_tenant: true,
    });
  };

  const handleEdit = (company: MasterCompany) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      slug: company.slug,
      company_type: company.company_type,
      description: company.description || '',
      website: company.website || '',
      email: company.email || '',
      phone: company.phone || '',
      gst_number: company.gst_number || '',
      pan_number: company.pan_number || '',
      status: company.status,
      is_potential_tenant: company.is_potential_tenant,
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCompany) {
      updateCompanyMutation.mutate({ id: selectedCompany.id, data: formData });
    } else {
      addCompanyMutation.mutate(formData);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Master Companies</h1>
          <p className="text-muted-foreground mt-1">
            Manage agriculture companies that can be suggested by AI or converted to tenants
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
            <Button variant="outline" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Companies ({companies?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : companies && companies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Potential Tenant</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{company.name}</div>
                          <div className="text-sm text-muted-foreground">{company.slug}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{company.company_type}</TableCell>
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
                      <div className="flex gap-2">
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
                          onClick={() => deleteCompanyMutation.mutate(company.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {company.is_potential_tenant && !company.converted_to_tenant && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => convertToTenantMutation.mutate(company.id)}
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No companies found. Add your first company to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={isAddModalOpen ? setIsAddModalOpen : setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            <DialogDescription>
              {selectedCompany ? 'Update company information' : 'Add a new agriculture company to the master database'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (!selectedCompany) {
                        setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_type">Company Type</Label>
                  <Select value={formData.company_type} onValueChange={(value) => setFormData({ ...formData, company_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="retailer">Retailer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <Input
                    id="pan_number"
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_potential_tenant"
                  checked={formData.is_potential_tenant}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_potential_tenant: checked as boolean })}
                />
                <Label htmlFor="is_potential_tenant">Mark as potential tenant</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedCompany(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedCompany ? 'Update' : 'Add'} Company
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}