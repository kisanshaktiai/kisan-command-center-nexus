import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, Search, Filter, Package, Edit, Trash2, Star, Shield, Leaf, 
  ChevronRight, ChevronLeft, Check, FileText, Image as ImageIcon,
  AlertCircle, Sparkles, TrendingUp, Clock, DollarSign, Video, Store
} from 'lucide-react';
import { ProductImageUpload, ProductImage } from '@/components/products/ProductImageUpload';
import { SocialMediaLinks, VideoUrls } from '@/components/products/SocialMediaLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { VarietyOfferingsDialog } from '@/components/master-data/VarietyOfferingsDialog';
import { useDuplicateVarietyCheck } from '@/hooks/useVarietyOfferings';

interface MasterProduct {
  id: string;
  company_id: string;
  category_id: string;
  manufacturer_id?: string;
  distributor_id?: string;
  sku: string;
  name: string;
  description: string | null;
  product_type: string;
  brand: string | null;
  barcode?: string;
  hsn_code?: string;
  registration_number?: string;
  active_ingredients: any[];
  composition: string | null;
  dosage_instructions: string | null;
  application_method: string | null;
  suitable_crops: any[];
  suitable_soil_types: any[];
  weather_conditions: any;
  packaging_options: any[];
  price_range: any;
  price_per_unit?: number;
  currency?: string;
  market_availability?: string;
  effectiveness_rating: number | null;
  safety_level: string | null;
  organic_certified: boolean;
  ai_recommendable: boolean;
  ai_metadata: any;
  images: any[];
  video_urls?: any;
  documents: any[];
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  is_featured?: boolean;
  is_bestseller?: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
  company?: any;
  category?: any;
}

const FORM_STEPS = [
  { id: 1, title: 'Basic Info', icon: Package },
  { id: 2, title: 'Details', icon: FileText },
  { id: 3, title: 'Agriculture', icon: Leaf },
  { id: 4, title: 'Compliance', icon: Shield },
  { id: 5, title: 'Pricing', icon: DollarSign },
  { id: 6, title: 'Media & Assets', icon: ImageIcon },
];

export default function MasterProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MasterProduct | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [currentStep, setCurrentStep] = useState(1);
  const [offeringsVariety, setOfferingsVariety] = useState<{ id: string; name: string } | null>(null);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    company_id: '',
    manufacturer_id: '',
    distributor_id: '',
    category_id: '',
    sku: '',
    name: '',
    brand: '',
    product_type: 'fertilizer',
    barcode: '',
    hsn_code: '',
    
    // Step 2: Product Details
    description: '',
    composition: '',
    active_ingredients: [] as string[],
    dosage_instructions: '',
    application_method: '',
    
    // Step 3: Agricultural Details
    suitable_crops: [] as string[],
    suitable_soil_types: [] as string[],
    recommended_season: [] as string[],
    crop_stages: [] as string[],
    pest_targets: [] as string[],
    disease_targets: [] as string[],
    
    // Step 4: Regulatory & Compliance
    registration_number: '',
    approval_authority: '',
    safety_level: 'moderate',
    organic_certified: false,
    storage_instructions: '',
    warnings: '',
    
    // Step 5: Pricing & Market
    price_per_unit: 0,
    currency: 'INR',
    unit_of_measure: 'kg',
    available_pack_sizes: [] as string[],
    market_availability: 'in_stock',
    minimum_order_quantity: 1,
    discount_applicable: false,
    
    // Step 6: Media & Settings
    images: [] as ProductImage[],
    video_urls: {
      youtube: [],
      instagram: [],
      facebook: []
    } as VideoUrls,
    effectiveness_rating: 0,
    ai_recommendable: true,
    status: 'active',
    is_featured: false,
    is_bestseller: false,
  });

  const queryClient = useQueryClient();

  // Duplicate-variety guardrail (new seed varieties only)
  const isNewSeedVariety = !selectedProduct && formData.product_type === 'seed';
  const { data: duplicateMatches = [], isFetching: isCheckingDuplicates } = useDuplicateVarietyCheck(
    formData.name,
    isNewSeedVariety && isAddModalOpen
  );
  const hasDuplicateWarning = isNewSeedVariety && duplicateMatches.length > 0;

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
          company:master_companies!master_products_company_id_fkey(id, name),
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
        company_id: data.company_id,
        manufacturer_id: data.manufacturer_id || null,
        distributor_id: data.distributor_id || null,
        category_id: data.category_id,
        sku: data.sku,
        name: data.name,
        brand: data.brand,
        product_type: data.product_type,
        barcode: data.barcode || null,
        hsn_code: data.hsn_code || null,
        description: data.description,
        composition: data.composition,
        active_ingredients: data.active_ingredients || [],
        dosage_instructions: data.dosage_instructions,
        application_method: data.application_method,
        suitable_crops: data.suitable_crops || [],
        suitable_soil_types: data.suitable_soil_types || [],
        recommended_season: data.recommended_season || [],
        crop_stages: data.crop_stages || [],
        pest_targets: data.pest_targets || [],
        disease_targets: data.disease_targets || [],
        registration_number: data.registration_number || null,
        approval_authority: data.approval_authority || null,
        safety_level: data.safety_level,
        organic_certified: data.organic_certified,
        storage_instructions: data.storage_instructions || null,
        warnings: data.warnings || null,
        price_per_unit: data.price_per_unit,
        currency: data.currency,
        unit_of_measure: data.unit_of_measure,
        available_pack_sizes: data.available_pack_sizes || [],
        market_availability: data.market_availability,
        minimum_order_quantity: data.minimum_order_quantity,
        discount_applicable: data.discount_applicable,
        effectiveness_rating: data.effectiveness_rating,
        ai_recommendable: data.ai_recommendable,
        status: data.status,
        is_featured: data.is_featured,
        is_bestseller: data.is_bestseller,
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
        .update({
          company_id: data.company_id,
          manufacturer_id: data.manufacturer_id || null,
          distributor_id: data.distributor_id || null,
          category_id: data.category_id,
          sku: data.sku,
          name: data.name,
          brand: data.brand,
          product_type: data.product_type,
          barcode: data.barcode || null,
          hsn_code: data.hsn_code || null,
          description: data.description,
          composition: data.composition,
          active_ingredients: data.active_ingredients || [],
          dosage_instructions: data.dosage_instructions,
          application_method: data.application_method,
          suitable_crops: data.suitable_crops || [],
          suitable_soil_types: data.suitable_soil_types || [],
          recommended_season: data.recommended_season || [],
          crop_stages: data.crop_stages || [],
          pest_targets: data.pest_targets || [],
          disease_targets: data.disease_targets || [],
          registration_number: data.registration_number || null,
          approval_authority: data.approval_authority || null,
          safety_level: data.safety_level,
          organic_certified: data.organic_certified,
          storage_instructions: data.storage_instructions || null,
          warnings: data.warnings || null,
          price_per_unit: data.price_per_unit,
          currency: data.currency,
          unit_of_measure: data.unit_of_measure,
          available_pack_sizes: data.available_pack_sizes || [],
          market_availability: data.market_availability,
          minimum_order_quantity: data.minimum_order_quantity,
          discount_applicable: data.discount_applicable,
          effectiveness_rating: data.effectiveness_rating,
          ai_recommendable: data.ai_recommendable,
          status: data.status,
          is_featured: data.is_featured,
          is_bestseller: data.is_bestseller,
        })
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
      manufacturer_id: '',
      distributor_id: '',
      category_id: '',
      sku: '',
      name: '',
      brand: '',
      product_type: 'fertilizer',
      barcode: '',
      hsn_code: '',
      description: '',
      composition: '',
      active_ingredients: [],
      dosage_instructions: '',
      application_method: '',
      suitable_crops: [],
      suitable_soil_types: [],
      recommended_season: [],
      crop_stages: [],
      pest_targets: [],
      disease_targets: [],
      registration_number: '',
      approval_authority: '',
      safety_level: 'moderate',
      organic_certified: false,
      storage_instructions: '',
      warnings: '',
      price_per_unit: 0,
      currency: 'INR',
      unit_of_measure: 'kg',
      available_pack_sizes: [],
      market_availability: 'in_stock',
      minimum_order_quantity: 1,
      discount_applicable: false,
      images: [] as ProductImage[],
      video_urls: { youtube: [], instagram: [], facebook: [] } as VideoUrls,
      effectiveness_rating: 0,
      ai_recommendable: true,
      status: 'active',
      is_featured: false,
      is_bestseller: false,
    });
    setCurrentStep(1);
    setDuplicateAcknowledged(false);
  };

  const handleEdit = (product: MasterProduct) => {
    setSelectedProduct(product);
    setFormData({
      company_id: product.company_id,
      manufacturer_id: product.manufacturer_id || '',
      distributor_id: product.distributor_id || '',
      category_id: product.category_id,
      sku: product.sku,
      name: product.name,
      brand: product.brand || '',
      product_type: product.product_type,
      barcode: product.barcode || '',
      hsn_code: product.hsn_code || '',
      description: product.description || '',
      composition: product.composition || '',
      active_ingredients: product.active_ingredients || [],
      dosage_instructions: product.dosage_instructions || '',
      application_method: product.application_method || '',
      suitable_crops: product.suitable_crops || [],
      suitable_soil_types: product.suitable_soil_types || [],
      recommended_season: [],
      crop_stages: [],
      pest_targets: [],
      disease_targets: [],
      registration_number: product.registration_number || '',
      approval_authority: '',
      safety_level: product.safety_level || 'moderate',
      organic_certified: product.organic_certified,
      storage_instructions: '',
      warnings: '',
      price_per_unit: product.price_per_unit || 0,
      currency: product.currency || 'INR',
      unit_of_measure: 'kg',
      available_pack_sizes: [],
      market_availability: product.market_availability || 'in_stock',
      minimum_order_quantity: 1,
      discount_applicable: false,
      images: (product.images as ProductImage[]) || [],
      video_urls: (product.video_urls as VideoUrls) || { youtube: [], instagram: [], facebook: [] },
      effectiveness_rating: product.effectiveness_rating || 0,
      ai_recommendable: product.ai_recommendable,
      status: product.status,
      is_featured: product.is_featured || false,
      is_bestseller: product.is_bestseller || false,
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct) {
      updateProductMutation.mutate({ id: selectedProduct.id, data: formData });
      return;
    }
    if (hasDuplicateWarning && !duplicateAcknowledged) {
      setCurrentStep(1);
      toast.error('Possible duplicate variety — confirm the override before saving');
      return;
    }
    addProductMutation.mutate(formData);
  };

  const handleNextStep = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const progress = (currentStep / 6) * 100;

  const getSafetyBadgeVariant = (level: string | null) => {
    switch (level) {
      case 'low': return 'default';
      case 'moderate': return 'secondary';
      case 'high': return 'destructive';
      case 'very_high': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Master Products
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your comprehensive agricultural product catalog
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{products?.length || 0}</p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {products?.filter(p => p.status === 'active').length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Featured</p>
                <p className="text-2xl font-bold text-amber-600">
                  {products?.filter(p => p.is_featured).length || 0}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {products?.filter(p => p.status === 'pending_approval').length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
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
            <Button variant="outline" className="w-full gap-2">
              <Filter className="h-4 w-4" />
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
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading products...</p>
            </div>
          ) : paginatedProducts && paginatedProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Safety</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Badges</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {product.sku} {product.brand && `• ${product.brand}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{product.company?.name || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category?.name || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.product_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {product.price_per_unit ? (
                          <div className="text-sm">
                            <span className="font-medium">{product.currency} {product.price_per_unit}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.effectiveness_rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                            <span className="text-sm font-medium">{product.effectiveness_rating}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.safety_level && (
                          <Badge variant={getSafetyBadgeVariant(product.safety_level)} className="gap-1">
                            <Shield className="h-3 w-3" />
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
                        <div className="flex items-center gap-1">
                          {product.ai_recommendable && (
                            <Badge variant="default" className="gap-1 text-xs">
                              <Sparkles className="h-3 w-3" />
                              AI
                            </Badge>
                          )}
                          {product.organic_certified && (
                            <Badge variant="default" className="gap-1 text-xs bg-green-600">
                              <Leaf className="h-3 w-3" />
                            </Badge>
                          )}
                          {product.is_featured && (
                            <Badge variant="default" className="text-xs bg-amber-600">
                              ⭐
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {product.product_type === 'seed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Sellers & offerings"
                              aria-label="Manage sellers and offerings"
                              onClick={() => setOfferingsVariety({ id: product.id, name: product.name })}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <Store className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this product?')) {
                                deleteProductMutation.mutate(product.id);
                              }
                            }}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first agricultural product
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sellers / Offerings for a seed variety */}
      <VarietyOfferingsDialog
        open={!!offeringsVariety}
        onOpenChange={(open) => !open && setOfferingsVariety(null)}
        varietyId={offeringsVariety?.id}
        varietyName={offeringsVariety?.name}
      />



      {/* Enhanced Add/Edit Modal with Step Wizard */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedProduct(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct ? 'Update comprehensive product information' : 'Add a new agricultural product with complete details'}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="px-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Step {currentStep} of 6</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
          </div>

          {/* Step Navigation */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4 border-b">
            {FORM_STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[80px] ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                  <span className="text-xs font-medium">{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-1">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_id" className="flex items-center gap-1">
                        Company <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={formData.company_id} 
                        onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                      >
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
                      <Label htmlFor="category_id" className="flex items-center gap-1">
                        Category <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={formData.category_id} 
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
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

                    <div className="space-y-2">
                      <Label htmlFor="product_type" className="flex items-center gap-1">
                        Product Type <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={formData.product_type} 
                        onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fertilizer">🌱 Fertilizer</SelectItem>
                          <SelectItem value="pesticide">🐛 Pesticide</SelectItem>
                          <SelectItem value="herbicide">🌿 Herbicide</SelectItem>
                          <SelectItem value="fungicide">🍄 Fungicide</SelectItem>
                          <SelectItem value="seed">🌾 Seed</SelectItem>
                          <SelectItem value="equipment">⚙️ Equipment</SelectItem>
                          <SelectItem value="other">📦 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sku" className="flex items-center gap-1">
                        SKU <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="sku"
                        placeholder="e.g., FRT-NPK-001"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name" className="flex items-center gap-1">
                        Product Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g., NPK 19:19:19 All Purpose Fertilizer"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        placeholder="e.g., GreenGrow"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="barcode">Barcode</Label>
                      <Input
                        id="barcode"
                        placeholder="e.g., 1234567890123"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hsn_code">HSN Code</Label>
                      <Input
                        id="hsn_code"
                        placeholder="e.g., 31051000"
                        value={formData.hsn_code}
                        onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manufacturer_id">Manufacturer (Optional)</Label>
                      <Select 
                        value={formData.manufacturer_id || undefined} 
                        onValueChange={(value) => setFormData({ ...formData, manufacturer_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select manufacturer (optional)" />
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
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Product Details */}
            {currentStep === 2 && (
              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Product Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Comprehensive product description for farmers..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="composition">Composition & Nutrients</Label>
                      <Textarea
                        id="composition"
                        placeholder="e.g., Nitrogen (N): 19%, Phosphorus (P): 19%, Potassium (K): 19%"
                        value={formData.composition}
                        onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="active_ingredients">Active Ingredients (comma separated)</Label>
                      <Input
                        id="active_ingredients"
                        placeholder="e.g., Urea, DAP, MOP"
                        value={formData.active_ingredients.join(', ')}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          active_ingredients: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dosage_instructions">Dosage & Application Instructions</Label>
                      <Textarea
                        id="dosage_instructions"
                        placeholder="e.g., Apply 25kg per acre at 30 days after sowing..."
                        value={formData.dosage_instructions}
                        onChange={(e) => setFormData({ ...formData, dosage_instructions: e.target.value })}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="application_method">Application Method</Label>
                      <Textarea
                        id="application_method"
                        placeholder="e.g., Foliar spray, soil application, drip irrigation..."
                        value={formData.application_method}
                        onChange={(e) => setFormData({ ...formData, application_method: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Agricultural Details */}
            {currentStep === 3 && (
              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-primary" />
                    Agricultural Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Suitable Crops (comma separated)</Label>
                      <Input
                        placeholder="e.g., Wheat, Rice, Cotton, Sugarcane"
                        value={formData.suitable_crops.join(', ')}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          suitable_crops: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Suitable Soil Types (comma separated)</Label>
                      <Input
                        placeholder="e.g., Loamy, Clay, Sandy, Alluvial"
                        value={formData.suitable_soil_types.join(', ')}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          suitable_soil_types: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Recommended Seasons (comma separated)</Label>
                      <Input
                        placeholder="e.g., Kharif, Rabi, Summer, Winter"
                        value={formData.recommended_season.join(', ')}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          recommended_season: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Crop Growth Stages (comma separated)</Label>
                      <Input
                        placeholder="e.g., Vegetative, Flowering, Fruiting, Maturity"
                        value={formData.crop_stages.join(', ')}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          crop_stages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                      />
                    </div>

                    {formData.product_type === 'pesticide' && (
                      <div className="space-y-2">
                        <Label>Target Pests (comma separated)</Label>
                        <Input
                          placeholder="e.g., Aphids, Bollworm, White fly"
                          value={formData.pest_targets.join(', ')}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            pest_targets: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                          })}
                        />
                      </div>
                    )}

                    {formData.product_type === 'fungicide' && (
                      <div className="space-y-2">
                        <Label>Target Diseases (comma separated)</Label>
                        <Input
                          placeholder="e.g., Blight, Rust, Mildew"
                          value={formData.disease_targets.join(', ')}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            disease_targets: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                          })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Regulatory & Compliance */}
            {currentStep === 4 && (
              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Regulatory & Compliance
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="registration_number">Registration Number</Label>
                        <Input
                          id="registration_number"
                          placeholder="e.g., CIB/REG/2023/001"
                          value={formData.registration_number}
                          onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="approval_authority">Approval Authority</Label>
                        <Input
                          id="approval_authority"
                          placeholder="e.g., CIB&RC, FCO, PPQS"
                          value={formData.approval_authority}
                          onChange={(e) => setFormData({ ...formData, approval_authority: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="safety_level">Safety Level</Label>
                      <Select 
                        value={formData.safety_level} 
                        onValueChange={(value) => setFormData({ ...formData, safety_level: value })}
                      >
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

                    <div className="space-y-2">
                      <Label htmlFor="storage_instructions">Storage Instructions</Label>
                      <Textarea
                        id="storage_instructions"
                        placeholder="e.g., Store in cool, dry place away from direct sunlight..."
                        value={formData.storage_instructions}
                        onChange={(e) => setFormData({ ...formData, storage_instructions: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="warnings">Safety Warnings & Precautions</Label>
                      <Textarea
                        id="warnings"
                        placeholder="e.g., Keep away from children, use protective equipment..."
                        value={formData.warnings}
                        onChange={(e) => setFormData({ ...formData, warnings: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2 p-4 rounded-lg border">
                      <Checkbox
                        id="organic_certified"
                        checked={formData.organic_certified}
                        onCheckedChange={(checked) => setFormData({ ...formData, organic_certified: checked as boolean })}
                      />
                      <div className="flex-1">
                        <Label htmlFor="organic_certified" className="cursor-pointer flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-green-600" />
                          Organic Certified Product
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          This product meets organic farming standards
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Pricing & Market */}
            {currentStep === 5 && (
              <div className="space-y-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Pricing & Market Information
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price_per_unit">Price per Unit</Label>
                        <Input
                          id="price_per_unit"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.price_per_unit}
                          onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) || 0 })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select 
                          value={formData.currency} 
                          onValueChange={(value) => setFormData({ ...formData, currency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR (₹)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                        <Select 
                          value={formData.unit_of_measure} 
                          onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Kilogram (kg)</SelectItem>
                            <SelectItem value="liter">Liter (L)</SelectItem>
                            <SelectItem value="gram">Gram (g)</SelectItem>
                            <SelectItem value="ml">Milliliter (ml)</SelectItem>
                            <SelectItem value="unit">Unit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Available Pack Sizes (comma separated)</Label>
                      <Input
                        placeholder="e.g., 1kg, 5kg, 10kg, 25kg, 50kg"
                        value={formData.available_pack_sizes.join(', ')}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          available_pack_sizes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="market_availability">Market Availability</Label>
                        <Select 
                          value={formData.market_availability} 
                          onValueChange={(value) => setFormData({ ...formData, market_availability: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_stock">✅ In Stock</SelectItem>
                            <SelectItem value="limited_stock">⚠️ Limited Stock</SelectItem>
                            <SelectItem value="out_of_stock">❌ Out of Stock</SelectItem>
                            <SelectItem value="pre_order">📦 Pre-Order</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="minimum_order_quantity">Minimum Order Quantity</Label>
                        <Input
                          id="minimum_order_quantity"
                          type="number"
                          min="1"
                          value={formData.minimum_order_quantity}
                          onChange={(e) => setFormData({ ...formData, minimum_order_quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-4 rounded-lg border">
                      <Checkbox
                        id="discount_applicable"
                        checked={formData.discount_applicable}
                        onCheckedChange={(checked) => setFormData({ ...formData, discount_applicable: checked as boolean })}
                      />
                      <div className="flex-1">
                        <Label htmlFor="discount_applicable" className="cursor-pointer">
                          Discount Applicable
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          This product is eligible for bulk discounts
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Media & Assets */}
            {currentStep === 6 && (
              <div className="space-y-8 py-4">
                {/* Product Images Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Product Images (Max 5) *
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload high-quality product images. Images will be automatically compressed to WebP format (~500KB) for optimal performance.
                  </p>
                  <ProductImageUpload
                    images={formData.images}
                    onImagesChange={(images) => setFormData({ ...formData, images })}
                    maxImages={5}
                  />
                </div>

                <Separator />

                {/* Social Media & Video Links */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    Social Media & Video Links
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add links to product videos on YouTube, Instagram, and Facebook to enhance product visibility.
                  </p>
                  <SocialMediaLinks
                    videoUrls={formData.video_urls}
                    onVideoUrlsChange={(urls) => setFormData({ ...formData, video_urls: urls })}
                  />
                </div>

                <Separator />

                {/* AI & Display Settings */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI & Display Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="effectiveness_rating">Effectiveness Rating (0-5)</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="effectiveness_rating"
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={formData.effectiveness_rating}
                          onChange={(e) => setFormData({ ...formData, effectiveness_rating: parseFloat(e.target.value) })}
                          className="max-w-xs"
                        />
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${
                                star <= formData.effectiveness_rating
                                  ? 'fill-amber-500 text-amber-500'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Product Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
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

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Product Features</h4>
                      
                      <div className="flex items-center space-x-2 p-4 rounded-lg border bg-primary/5">
                        <Checkbox
                          id="ai_recommendable"
                          checked={formData.ai_recommendable}
                          onCheckedChange={(checked) => setFormData({ ...formData, ai_recommendable: checked as boolean })}
                        />
                        <div className="flex-1">
                          <Label htmlFor="ai_recommendable" className="cursor-pointer flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Enable AI Recommendations
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Allow AI to recommend this product to farmers
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-4 rounded-lg border bg-amber-500/5">
                        <Checkbox
                          id="is_featured"
                          checked={formData.is_featured}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked as boolean })}
                        />
                        <div className="flex-1">
                          <Label htmlFor="is_featured" className="cursor-pointer flex items-center gap-2">
                            ⭐ Featured Product
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Show this product prominently in listings
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 p-4 rounded-lg border bg-green-500/5">
                        <Checkbox
                          id="is_bestseller"
                          checked={formData.is_bestseller}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_bestseller: checked as boolean })}
                        />
                        <div className="flex-1">
                          <Label htmlFor="is_bestseller" className="cursor-pointer flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Bestseller
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Mark as a top-selling product
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">Ready to Submit?</h4>
                          <p className="text-xs text-muted-foreground">
                            Make sure all required information (including at least 1 product image) is filled out correctly. 
                            You can always edit this product later.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 pb-2 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Step {currentStep} of 6
              </div>

              {currentStep < 6 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={addProductMutation.isPending || updateProductMutation.isPending}
                >
                  {addProductMutation.isPending || updateProductMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {selectedProduct ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
