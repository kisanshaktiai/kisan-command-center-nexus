import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Layers, 
  Edit, 
  Trash2, 
  ChevronRight,
  Grid3X3,
  List,
  Download,
  Filter,
  Package,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryCard } from '@/components/super-admin/categories/CategoryCard';
import { CategoryQuickView } from '@/components/super-admin/categories/CategoryQuickView';

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
  parent?: { id: string; name: string };
  parent_category?: { id: string; name: string };
  product_count?: number;
  subcategory_count?: number;
}

export default function ProductCategories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [quickViewCategory, setQuickViewCategory] = useState<ProductCategory | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: '',
    icon: '',
    is_active: true,
  });

  const queryClient = useQueryClient();

  // Fetch categories with enhanced data
  const { data: categories, isLoading } = useQuery({
    queryKey: ['master-product-categories', searchTerm, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('master_product_categories')
        .select('*, parent:parent_id(id, name)')
        .order('name');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
      }

      if (filterStatus !== 'all') {
        query = query.eq('is_active', filterStatus === 'active');
      }

      const { data: categoriesData, error } = await query;
      if (error) throw error;

      // Enhance data with counts
      const enhancedCategories = await Promise.all(
        (categoriesData || []).map(async (category) => {
          // Get product count
          const { count: productCount } = await supabase
            .from('master_products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);

          // Get subcategory count
          const { count: subcategoryCount } = await supabase
            .from('master_product_categories')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', category.id);

          return {
            ...category,
            parent_category: category.parent,
            product_count: productCount || 0,
            subcategory_count: subcategoryCount || 0,
          };
        })
      );

      return enhancedCategories;
    },
  });

  // Calculate stats
  const stats = {
    total: categories?.length || 0,
    active: categories?.filter(c => c.is_active).length || 0,
    root: categories?.filter(c => !c.parent_id).length || 0,
    withProducts: categories?.filter(c => c.product_count > 0).length || 0,
  };

  // Pagination
  const paginatedCategories = itemsPerPage === 'all' 
    ? categories 
    : categories?.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil((categories?.length || 0) / itemsPerPage);

  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('master_product_categories').insert({
        ...data,
        parent_id: data.parent_id || null,
        metadata: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-product-categories'] });
      toast.success('Category added successfully');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add category');
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('master_product_categories')
        .update({
          ...data,
          parent_id: data.parent_id || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-product-categories'] });
      toast.success('Category updated successfully');
      setIsEditModalOpen(false);
      setSelectedCategory(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category');
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('master_product_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-product-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('master_product_categories')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-product-categories'] });
      toast.success('Categories deleted successfully');
      setSelectedCategories(new Set());
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete categories');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      parent_id: '',
      icon: '',
      is_active: true,
    });
  };

  const handleEdit = (category: ProductCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parent_id: category.parent_id || '',
      icon: category.icon || '',
      is_active: category.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, data: formData });
    } else {
      addCategoryMutation.mutate(formData);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSelectCategory = (id: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCategories.size === paginatedCategories?.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(paginatedCategories?.map(c => c.id) || []));
    }
  };

  const handleExport = () => {
    if (!categories) return;
    
    const csv = [
      ['Name', 'Slug', 'Parent', 'Status', 'Products', 'Subcategories', 'Created'],
      ...categories.map(c => [
        c.name,
        c.slug,
        c.parent_category?.name || 'Root',
        c.is_active ? 'Active' : 'Inactive',
        c.product_count || 0,
        c.subcategory_count || 0,
        new Date(c.created_at).toLocaleDateString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-categories.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background p-8">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Product Categories</h1>
              <p className="text-muted-foreground mt-2">
                Organize products into categories for better management
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="bg-background/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Categories</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Layers className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-emerald-600/20" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Root Categories</p>
                    <p className="text-2xl font-bold">{stats.root}</p>
                  </div>
                  <Layers className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">With Products</p>
                    <p className="text-2xl font-bold">{stats.withProducts}</p>
                  </div>
                  <Package className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedCategories.size > 0 && (
            <div className="flex items-center gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedCategories.size} selected
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedCategories))}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCategories(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Display */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Categories ({categories?.length || 0})</CardTitle>
            {viewMode === 'table' && (
              <Checkbox
                checked={selectedCategories.size === paginatedCategories?.length && paginatedCategories?.length > 0}
                onCheckedChange={handleSelectAll}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : paginatedCategories && paginatedCategories.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteCategoryMutation.mutate(id)}
                    onView={setQuickViewCategory}
                    isSelected={selectedCategories.has(category.id)}
                    onSelect={handleSelectCategory}
                  />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCategories.size === paginatedCategories?.length && paginatedCategories?.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCategories.has(category.id)}
                          onCheckedChange={() => handleSelectCategory(category.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{category.name}</div>
                            <div className="text-sm text-muted-foreground">{category.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category.parent_category ? (
                          <div className="flex items-center gap-1 text-sm">
                            <ChevronRight className="h-3 w-3" />
                            {category.parent_category.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Root</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {category.description ? (
                          <span className="text-sm line-clamp-2">{category.description}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.product_count || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? 'default' : 'secondary'}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No categories found. Add your first category to get started.
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {itemsPerPage === 'all'
                  ? `Showing all ${categories?.length || 0} categories`
                  : `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, categories?.length || 0)} to ${Math.min(currentPage * itemsPerPage, categories?.length || 0)} of ${categories?.length || 0} categories`
                }
              </span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(value) => {
                  setItemsPerPage(value === 'all' ? 'all' : Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick View Modal */}
      <CategoryQuickView
        category={quickViewCategory}
        isOpen={!!quickViewCategory}
        onClose={() => setQuickViewCategory(null)}
        onEdit={handleEdit}
      />

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={isAddModalOpen ? setIsAddModalOpen : setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {selectedCategory ? 'Update category information' : 'Create a new product category'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (!selectedCategory) {
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

              <div className="space-y-2">
                <Label htmlFor="parent_id">Parent Category (Optional)</Label>
                <Select value={formData.parent_id || "none"} onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Category)</SelectItem>
                    {categories?.filter(cat => cat.id !== selectedCategory?.id).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedCategory(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedCategory ? 'Update' : 'Add'} Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}