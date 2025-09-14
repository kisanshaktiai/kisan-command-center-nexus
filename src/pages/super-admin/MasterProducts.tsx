import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Filter, Package, Edit, Trash2, Star, Shield, Leaf } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MasterProduct {
  id: string;
  company_id: string;
  category_id: string;
  sku: string;
  name: string;
  description: string | null;
  product_type: string;
  brand: string | null;
  active_ingredients: any[];
  composition: string | null;
  dosage_instructions: string | null;
  application_method: string | null;
  suitable_crops: any[];
  suitable_soil_types: any[];
  weather_conditions: any;
  packaging_options: any[];
  price_range: any;
  effectiveness_rating: number | null;
  safety_level: string | null;
  organic_certified: boolean;
  ai_recommendable: boolean;
  ai_metadata: any;
  images: any[];
  documents: any[];
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  company?: any;
  category?: any;
}

export default function MasterProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MasterProduct | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [formData, setFormData] = useState({
    company_id: '',
    category_id: '',
    sku: '',
    name: '',
    description: '',
    product_type: 'fertilizer',
    brand: '',
    composition: '',
    dosage_instructions: '',
    application_method: '',
    effectiveness_rating: 0,
    safety_level: 'moderate',
    organic_certified: false,
    ai_recommendable: true,
    status: 'active',
    suitable_crops: [] as string[],
    active_ingredients: [] as string[],
  });

  const queryClient = useQueryClient();

  // Fetch companies for dropdown
  const { data: companies } = useQuery({
    queryKey: ['master-companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ['master-categories-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_product_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch master products
  const { data: products, isLoading } = useQuery({
    queryKey: ['master-products', statusFilter, productTypeFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('master_products')
        .select(`
          *,
          company:master_companies(id, name),
          category:master_product_categories(id, name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (productTypeFilter !== 'all') {
        query = query.eq('product_type', productTypeFilter);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MasterProduct[];
    },
  });

  // Paginated products
  const paginatedProducts = useMemo(() => {
    if (!products) return [];
    if (itemsPerPage === 'all') {
      return products;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return products.slice(startIndex, endIndex);
  }, [products, currentPage, itemsPerPage]);

  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil((products?.length || 0) / itemsPerPage);

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('master_products').insert({
        ...data,
        suitable_crops: data.suitable_crops || [],
        active_ingredients: data.active_ingredients || [],
        suitable_soil_types: [],
        weather_conditions: {},
        packaging_options: [],
        price_range: {},
        ai_metadata: {},
        images: [],
        documents: [],
        metadata: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-products'] });
      toast.success('Product added successfully');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add product');
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('master_products')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-products'] });
      toast.success('Product updated successfully');
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update product');
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('master_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  const resetForm = () => {
    setFormData({
      company_id: '',
      category_id: '',
      sku: '',
      name: '',
      description: '',
      product_type: 'fertilizer',
      brand: '',
      composition: '',
      dosage_instructions: '',
      application_method: '',
      effectiveness_rating: 0,
      safety_level: 'moderate',
      organic_certified: false,
      ai_recommendable: true,
      status: 'active',
      suitable_crops: [],
      active_ingredients: [],
    });
  };

  const handleEdit = (product: MasterProduct) => {
    setSelectedProduct(product);
    setFormData({
      company_id: product.company_id,
      category_id: product.category_id,
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      product_type: product.product_type,
      brand: product.brand || '',
      composition: product.composition || '',
      dosage_instructions: product.dosage_instructions || '',
      application_method: product.application_method || '',
      effectiveness_rating: product.effectiveness_rating || 0,
      safety_level: product.safety_level || 'moderate',
      organic_certified: product.organic_certified,
      ai_recommendable: product.ai_recommendable,
      status: product.status,
      suitable_crops: product.suitable_crops || [],
      active_ingredients: product.active_ingredients || [],
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct) {
      updateProductMutation.mutate({ id: selectedProduct.id, data: formData });
    } else {
      addProductMutation.mutate(formData);
    }
  };

  const getSafetyBadgeVariant = (level: string | null) => {
    switch (level) {
      case 'low': return 'success';
      case 'moderate': return 'default';
      case 'high': return 'warning';
      case 'very_high': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Master Products</h1>
          <p className="text-muted-foreground mt-1">
            Central repository of agricultural products for AI recommendations
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
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
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="fertilizer">Fertilizer</SelectItem>
                <SelectItem value="pesticide">Pesticide</SelectItem>
                <SelectItem value="herbicide">Herbicide</SelectItem>
                <SelectItem value="fungicide">Fungicide</SelectItem>
                <SelectItem value="seed">Seed</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({products?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : paginatedProducts && paginatedProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Safety</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI Ready</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.company?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {product.category?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.product_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {product.effectiveness_rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-sm">{product.effectiveness_rating}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {product.safety_level && (
                        <Badge variant={getSafetyBadgeVariant(product.safety_level)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {product.safety_level}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        product.status === 'active' ? 'default' :
                        product.status === 'inactive' ? 'secondary' :
                        product.status === 'discontinued' ? 'destructive' :
                        'outline'
                      }>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.ai_recommendable && (
                          <Badge variant="success" className="gap-1">
                            <span className="text-xs">AI</span>
                          </Badge>
                        )}
                        {product.organic_certified && (
                          <Badge variant="success" className="gap-1">
                            <Leaf className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProductMutation.mutate(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No products found. Add your first product to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={isAddModalOpen ? setIsAddModalOpen : setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {selectedProduct ? 'Update product information' : 'Add a new agricultural product to the master database'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Product Details</TabsTrigger>
                <TabsTrigger value="ai">AI Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_id">Company</Label>
                    <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies?.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Category</Label>
                    <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product_type">Product Type</Label>
                    <Select value={formData.product_type} onValueChange={(value) => setFormData({ ...formData, product_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fertilizer">Fertilizer</SelectItem>
                        <SelectItem value="pesticide">Pesticide</SelectItem>
                        <SelectItem value="herbicide">Herbicide</SelectItem>
                        <SelectItem value="fungicide">Fungicide</SelectItem>
                        <SelectItem value="seed">Seed</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="composition">Composition</Label>
                  <Textarea
                    id="composition"
                    value={formData.composition}
                    onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dosage_instructions">Dosage Instructions</Label>
                  <Textarea
                    id="dosage_instructions"
                    value={formData.dosage_instructions}
                    onChange={(e) => setFormData({ ...formData, dosage_instructions: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="application_method">Application Method</Label>
                  <Textarea
                    id="application_method"
                    value={formData.application_method}
                    onChange={(e) => setFormData({ ...formData, application_method: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="effectiveness_rating">Effectiveness Rating (0-5)</Label>
                    <Input
                      id="effectiveness_rating"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.effectiveness_rating}
                      onChange={(e) => setFormData({ ...formData, effectiveness_rating: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="safety_level">Safety Level</Label>
                    <Select value={formData.safety_level} onValueChange={(value) => setFormData({ ...formData, safety_level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="moderate">Moderate Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                        <SelectItem value="very_high">Very High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="organic_certified"
                    checked={formData.organic_certified}
                    onCheckedChange={(checked) => setFormData({ ...formData, organic_certified: checked as boolean })}
                  />
                  <Label htmlFor="organic_certified">Organic Certified</Label>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ai_recommendable"
                    checked={formData.ai_recommendable}
                    onCheckedChange={(checked) => setFormData({ ...formData, ai_recommendable: checked as boolean })}
                  />
                  <Label htmlFor="ai_recommendable">Enable AI Recommendations</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Product Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Suitable Crops (comma separated)</Label>
                  <Input
                    value={formData.suitable_crops.join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      suitable_crops: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                    })}
                    placeholder="e.g., Wheat, Rice, Cotton"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Active Ingredients (comma separated)</Label>
                  <Input
                    value={formData.active_ingredients.join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      active_ingredients: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                    })}
                    placeholder="e.g., Nitrogen, Phosphorus, Potassium"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedProduct(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedProduct ? 'Update' : 'Add'} Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}