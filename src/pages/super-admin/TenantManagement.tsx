// src/pages/super-admin/TenantManagement.tsx

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Plus, Edit, Trash2, Building2, Users, Settings, Search, ChevronLeft, ChevronRight } from 'lucide-react';

// Database types from Supabase
type DatabaseTenant = Tables<'tenants'>;
type DatabaseSubscriptionPlan = 'kisan' | 'shakti' | 'ai';
type DatabaseTenantType = DatabaseTenant['type'];
type DatabaseTenantStatus = DatabaseTenant['status'];

// Frontend interface for form handling
interface TenantFormData {
  name: string;
  slug: string;
  type: DatabaseTenantType;
  status: DatabaseTenantStatus;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: any;
  established_date?: string;
  subscription_plan: DatabaseSubscriptionPlan;
  subscription_start_date?: string;
  subscription_end_date?: string;
  trial_ends_at?: string;
  max_farmers?: number;
  max_dealers?: number;
  max_products?: number;
  max_storage_gb?: number;
  max_api_calls_per_day?: number;
  subdomain?: string;
  custom_domain?: string;
  metadata?: Record<string, any>;
}

// Form validation interface
interface FormErrors {
  [key: string]: string;
}

// RPC Response interface
interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
  tenant_id?: string;
}

// Type mapping helpers
const subscriptionPlanOptions: { value: DatabaseSubscriptionPlan; label: string }[] = [
  { value: 'kisan', label: 'Kisan' },
  { value: 'shakti', label: 'Shakti' },
  { value: 'ai', label: 'AI' },
];

const tenantTypeOptions: { value: DatabaseTenantType; label: string }[] = [
  { value: 'agri_company', label: 'Agriculture Company' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'ngo', label: 'NGO' },
  { value: 'government', label: 'Government' },
  { value: 'university', label: 'University' },
  { value: 'sugar_factory', label: 'Sugar Factory' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'insurance', label: 'Insurance' },
];

const tenantStatusOptions: { value: DatabaseTenantStatus; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Utility function to get plan limits
const getPlanLimits = (plan: DatabaseSubscriptionPlan) => {
  const limits = {
    kisan: { farmers: 1000, dealers: 50, products: 100, storage: 10, api_calls: 10000 },
    shakti: { farmers: 5000, dealers: 200, products: 500, storage: 50, api_calls: 50000 },
    ai: { farmers: 20000, dealers: 1000, products: 2000, storage: 200, api_calls: 200000 },
  };
  return limits[plan] || limits.kisan;
};

// Helper function to convert subscription plan
const convertSubscriptionPlan = (plan: DatabaseSubscriptionPlan): DatabaseTenant['subscription_plan'] => {
  // Map our frontend plans to database plans
  const planMapping: Record<DatabaseSubscriptionPlan, DatabaseTenant['subscription_plan']> = {
    'kisan': 'starter',
    'shakti': 'growth', 
    'ai': 'enterprise'
  };
  return planMapping[plan] || 'starter';
};

// Helper function to convert from database plan to frontend plan
const convertFromDatabasePlan = (dbPlan: DatabaseTenant['subscription_plan']): DatabaseSubscriptionPlan => {
  const reverseMapping: Record<NonNullable<DatabaseTenant['subscription_plan']>, DatabaseSubscriptionPlan> = {
    'starter': 'kisan',
    'growth': 'shakti',
    'enterprise': 'ai',
    'custom': 'ai'
  };
  return reverseMapping[dbPlan || 'starter'] || 'kisan';
};

export default function TenantManagement() {
  const [tenants, setTenants] = useState<DatabaseTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingTenant, setEditingTenant] = useState<DatabaseTenant | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    type: 'agri_company',
    status: 'trial',
    subscription_plan: 'kisan',
    max_farmers: 1000,
    max_dealers: 50,
    max_products: 100,
    max_storage_gb: 10,
    max_api_calls_per_day: 10000,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    try {
      // Call the database function for tenant creation with validation
      const { data, error } = await supabase.rpc('create_tenant_with_validation', {
        p_name: formData.name,
        p_slug: formData.slug,
        p_type: formData.type,
        p_status: formData.status,
        p_subscription_plan: formData.subscription_plan,
        p_owner_name: formData.owner_name || null,
        p_owner_email: formData.owner_email || null,
        p_owner_phone: formData.owner_phone || null,
        p_business_registration: formData.business_registration || null,
        p_business_address: formData.business_address || null,
        p_established_date: formData.established_date || null,
        p_subscription_start_date: formData.subscription_start_date || null,
        p_subscription_end_date: formData.subscription_end_date || null,
        p_trial_ends_at: formData.trial_ends_at || null,
        p_max_farmers: formData.max_farmers || null,
        p_max_dealers: formData.max_dealers || null,
        p_max_products: formData.max_products || null,
        p_max_storage_gb: formData.max_storage_gb || null,
        p_max_api_calls_per_day: formData.max_api_calls_per_day || null,
        p_subdomain: formData.subdomain || null,
        p_custom_domain: formData.custom_domain || null,
        p_metadata: formData.metadata || {}
      });

      if (error) throw error;

      // Type assertion for the RPC response
      const result = data as RpcResponse;

      if (result && !result.success) {
        toast({
          title: "Validation Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: result?.message || "Tenant created successfully",
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchTenants(); // Refresh the list
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTenant = async () => {
    if (!editingTenant) return;

    try {
      // Set plan limits based on subscription plan
      const planLimits = getPlanLimits(formData.subscription_plan);
      
      // Ensure metadata and business_address are properly formatted
      const metadata = formData.metadata && typeof formData.metadata === 'object' 
        ? formData.metadata 
        : {};
      
      const businessAddress = formData.business_address && typeof formData.business_address === 'object'
        ? formData.business_address
        : formData.business_address
          ? { address: formData.business_address }
          : null;
      
      const updateData = {
        ...formData,
        subscription_plan: convertSubscriptionPlan(formData.subscription_plan),
        max_farmers: formData.max_farmers || planLimits.farmers,
        max_dealers: formData.max_dealers || planLimits.dealers,
        max_products: formData.max_products || planLimits.products,
        max_storage_gb: formData.max_storage_gb || planLimits.storage,
        max_api_calls_per_day: formData.max_api_calls_per_day || planLimits.api_calls,
        metadata,
        business_address: businessAddress,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('tenants')
        .update(updateData as any)
        .eq('id', editingTenant.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });

      setTenants(prev => prev.map(t => t.id === editingTenant.id ? data : t));
      setIsEditDialogOpen(false);
      setEditingTenant(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tenants')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });

      setTenants(prev => prev.filter(t => t.id !== tenantId));
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete tenant",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (tenant: DatabaseTenant) => {
    setEditingTenant(tenant);
    
    // Safely handle metadata and business_address
    const metadata = tenant.metadata && typeof tenant.metadata === 'object' 
      ? tenant.metadata as Record<string, any>
      : {};
    
    const businessAddress = tenant.business_address && typeof tenant.business_address === 'object'
      ? tenant.business_address as Record<string, any>
      : tenant.business_address
        ? { address: tenant.business_address }
        : undefined;
    
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      type: tenant.type,
      status: tenant.status || 'trial',
      owner_name: tenant.owner_name || '',
      owner_email: tenant.owner_email || '',
      owner_phone: tenant.owner_phone || '',
      business_registration: tenant.business_registration || '',
      business_address: businessAddress,
      established_date: tenant.established_date || '',
      subscription_plan: convertFromDatabasePlan(tenant.subscription_plan),
      subscription_start_date: tenant.subscription_start_date || '',
      subscription_end_date: tenant.subscription_end_date || '',
      trial_ends_at: tenant.trial_ends_at || '',
      max_farmers: tenant.max_farmers || 1000,
      max_dealers: tenant.max_dealers || 50,
      max_products: tenant.max_products || 100,
      max_storage_gb: tenant.max_storage_gb || 10,
      max_api_calls_per_day: tenant.max_api_calls_per_day || 10000,
      subdomain: tenant.subdomain || '',
      custom_domain: tenant.custom_domain || '',
      metadata,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      type: 'agri_company',
      status: 'trial',
      subscription_plan: 'kisan',
      max_farmers: 1000,
      max_dealers: 50,
      max_products: 100,
      max_storage_gb: 10,
      max_api_calls_per_day: 10000,
    });
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tenant.type === filterType;
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadgeVariant = (status: DatabaseTenantStatus | null) => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'suspended': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const getPlanBadgeVariant = (plan: DatabaseTenant['subscription_plan']) => {
    switch (plan) {
      case 'enterprise': return 'default';
      case 'growth': return 'secondary';
      case 'starter': return 'outline';
      default: return 'outline';
    }
  };

  const getPlanDisplayName = (plan: DatabaseTenant['subscription_plan']) => {
    const displayNames = {
      'starter': 'Kisan',
      'growth': 'Shakti', 
      'enterprise': 'AI',
      'custom': 'Custom'
    };
    return displayNames[plan || 'starter'] || 'Kisan';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">Manage and configure tenant organizations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Set up a new tenant organization with their subscription and limits.
              </DialogDescription>
            </DialogHeader>
            <EnhancedTenantForm 
              formData={formData} 
              setFormData={setFormData} 
              onSubmit={handleCreateTenant}
              isEditing={false}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {tenantTypeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {tenantStatusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{tenant.name}</CardTitle>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(tenant)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTenant(tenant.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                <span className="font-medium">@{tenant.slug}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={getStatusBadgeVariant(tenant.status)}>
                  {tenant.status || 'trial'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plan</span>
                <Badge variant={getPlanBadgeVariant(tenant.subscription_plan)}>
                  {getPlanDisplayName(tenant.subscription_plan)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium">
                  {tenantTypeOptions.find(t => t.value === tenant.type)?.label || tenant.type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Farmers</span>
                <span className="text-sm font-medium">{tenant.max_farmers || 1000}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-muted-foreground">No tenants found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters.' 
              : 'Get started by creating your first tenant.'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information, subscription, and limits.
            </DialogDescription>
          </DialogHeader>
          <EnhancedTenantForm 
            formData={formData} 
            setFormData={setFormData} 
            onSubmit={handleUpdateTenant}
            isEditing={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Enhanced Tenant Form Component with Navigation
interface EnhancedTenantFormProps {
  formData: TenantFormData;
  setFormData: React.Dispatch<React.SetStateAction<TenantFormData>>;
  onSubmit: () => void;
  isEditing: boolean;
}

function EnhancedTenantForm({ formData, setFormData, onSubmit, isEditing }: EnhancedTenantFormProps) {
  const [currentTab, setCurrentTab] = useState('basic');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'contact', label: 'Contact' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'limits', label: 'Limits & Config' }
  ];

  const currentTabIndex = tabs.findIndex(tab => tab.id === currentTab);

  const validateCurrentTab = () => {
    const newErrors: FormErrors = {};

    switch (currentTab) {
      case 'basic':
        if (!formData.name.trim()) newErrors.name = 'Organization name is required';
        if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
        if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
          newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
        }
        break;
      case 'contact':
        if (formData.owner_email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.owner_email)) {
          newErrors.owner_email = 'Invalid email format';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentTab() && currentTabIndex < tabs.length - 1) {
      setCurrentTab(tabs[currentTabIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentTabIndex > 0) {
      setCurrentTab(tabs[currentTabIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentTab()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof TenantFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Auto-update limits when subscription plan changes
    if (field === 'subscription_plan') {
      const limits = getPlanLimits(value as DatabaseSubscriptionPlan);
      setFormData(prev => ({
        ...prev,
        max_farmers: limits.farmers,
        max_dealers: limits.dealers,
        max_products: limits.products,
        max_storage_gb: limits.storage,
        max_api_calls_per_day: limits.api_calls,
      }));
    }

    // Auto-generate slug from name
    if (field === 'name' && !isEditing) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter organization name"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug*</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                placeholder="organization-slug"
                disabled={isEditing}
                className={errors.slug ? 'border-destructive' : ''}
              />
              {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Organization Type*</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange('type', value as DatabaseTenantType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {tenantTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value as DatabaseTenantStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {tenantStatusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_registration">Business Registration</Label>
            <Input
              id="business_registration"
              value={formData.business_registration || ''}
              onChange={(e) => handleChange('business_registration', e.target.value)}
              placeholder="Enter business registration number"
            />
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner Name</Label>
              <Input
                id="owner_name"
                value={formData.owner_name || ''}
                onChange={(e) => handleChange('owner_name', e.target.value)}
                placeholder="Enter owner name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_email">Owner Email</Label>
              <Input
                id="owner_email"
                type="email"
                value={formData.owner_email || ''}
                onChange={(e) => handleChange('owner_email', e.target.value)}
                placeholder="Enter owner email"
                className={errors.owner_email ? 'border-destructive' : ''}
              />
              {errors.owner_email && <p className="text-sm text-destructive">{errors.owner_email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_phone">Owner Phone</Label>
            <Input
              id="owner_phone"
              value={formData.owner_phone || ''}
              onChange={(e) => handleChange('owner_phone', e.target.value)}
              placeholder="Enter owner phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_address">Business Address</Label>
            <Textarea
              id="business_address"
              value={
                formData.business_address && typeof formData.business_address === 'object'
                  ? JSON.stringify(formData.business_address, null, 2)
                  : formData.business_address || ''
              }
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleChange('business_address', parsed);
                } catch {
                  handleChange('business_address', e.target.value);
                }
              }}
              placeholder="Enter business address (JSON format or plain text)"
              rows={3}
            />
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subscription_plan">Subscription Plan*</Label>
              <Select 
                value={formData.subscription_plan} 
                onValueChange={(value) => handleChange('subscription_plan', value as DatabaseSubscriptionPlan)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlanOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="established_date">Established Date</Label>
              <Input
                id="established_date"
                type="date"
                value={formData.established_date || ''}
                onChange={(e) => handleChange('established_date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subscription_start_date">Subscription Start</Label>
              <Input
                id="subscription_start_date"
                type="datetime-local"
                value={formData.subscription_start_date ? formData.subscription_start_date.slice(0, 16) : ''}
                onChange={(e) => handleChange('subscription_start_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription_end_date">Subscription End</Label>
              <Input
                id="subscription_end_date"
                type="datetime-local"
                value={formData.subscription_end_date ? formData.subscription_end_date.slice(0, 16) : ''}
                onChange={(e) => handleChange('subscription_end_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trial_ends_at">Trial Ends At</Label>
            <Input
              id="trial_ends_at"
              type="datetime-local"
              value={formData.trial_ends_at ? formData.trial_ends_at.slice(0, 16) : ''}
              onChange={(e) => handleChange('trial_ends_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
            />
          </div>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_farmers">Max Farmers</Label>
              <Input
                id="max_farmers"
                type="number"
                value={formData.max_farmers || 0}
                onChange={(e) => handleChange('max_farmers', parseInt(e.target.value))}
                placeholder="Maximum farmers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_dealers">Max Dealers</Label>
              <Input
                id="max_dealers"
                type="number"
                value={formData.max_dealers || 0}
                onChange={(e) => handleChange('max_dealers', parseInt(e.target.value))}
                placeholder="Maximum dealers"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_products">Max Products</Label>
              <Input
                id="max_products"
                type="number"
                value={formData.max_products || 0}
                onChange={(e) => handleChange('max_products', parseInt(e.target.value))}
                placeholder="Maximum products"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_storage_gb">Max Storage (GB)</Label>
              <Input
                id="max_storage_gb"
                type="number"
                value={formData.max_storage_gb || 0}
                onChange={(e) => handleChange('max_storage_gb', parseInt(e.target.value))}
                placeholder="Maximum storage in GB"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_api_calls_per_day">Max API Calls Per Day</Label>
            <Input
              id="max_api_calls_per_day"
              type="number"
              value={formData.max_api_calls_per_day || 0}
              onChange={(e) => handleChange('max_api_calls_per_day', parseInt(e.target.value))}
              placeholder="Maximum API calls per day"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={formData.subdomain || ''}
                onChange={(e) => handleChange('subdomain', e.target.value)}
                placeholder="tenant-subdomain"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_domain">Custom Domain</Label>
              <Input
                id="custom_domain"
                value={formData.custom_domain || ''}
                onChange={(e) => handleChange('custom_domain', e.target.value)}
                placeholder="custom.domain.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadata">Metadata (JSON)</Label>
            <Textarea
              id="metadata"
              value={
                formData.metadata && typeof formData.metadata === 'object'
                  ? JSON.stringify(formData.metadata, null, 2)
                  : '{}'
              }
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleChange('metadata', parsed);
                } catch {
                  // Keep the string value for now, will be validated on submit
                }
              }}
              placeholder="Enter metadata in JSON format"
              rows={4}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Navigation and Submit Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentTabIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {currentTabIndex + 1} of {tabs.length}
          </span>
          <div className="flex space-x-1">
            {tabs.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index <= currentTabIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {currentTabIndex < tabs.length - 1 ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : isEditing ? 'Update Tenant' : 'Create Tenant'}
          </Button>
        )}
      </div>
    </div>
  );
}
