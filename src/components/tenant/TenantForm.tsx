
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';
import { TenantType, TenantStatus, SubscriptionPlan, tenantTypeOptions, tenantStatusOptions, subscriptionPlanOptions } from '@/types/tenant';

interface TenantFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<CreateTenantDTO>;
  onSubmit: (data: CreateTenantDTO | UpdateTenantDTO) => Promise<boolean>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<CreateTenantDTO>({
    name: '',
    slug: '',
    type: 'agri_company',
    status: 'trial',
    subscription_plan: 'Kisan_Basic',
    owner_email: '',
    owner_name: '',
    owner_phone: '',
    business_registration: '',
    business_address: {},
    established_date: '',
    subscription_start_date: '',
    subscription_end_date: '',
    trial_ends_at: '',
    max_farmers: 1000,
    max_dealers: 50,
    max_products: 100,
    max_storage_gb: 10,
    max_api_calls_per_day: 10000,
    subdomain: '',
    custom_domain: '',
    metadata: {},
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && mode === 'create') {
      const generatedSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, mode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Organization name is required';
    }

    if (!formData.slug?.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    if (mode === 'create') {
      if (!formData.owner_email?.trim()) {
        newErrors.owner_email = 'Administrator email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email)) {
        newErrors.owner_email = 'Invalid email format';
      }

      if (!formData.owner_name?.trim()) {
        newErrors.owner_name = 'Administrator name is required';
      }
    }

    if (!formData.type) {
      newErrors.type = 'Organization type is required';
    }

    if (!formData.subscription_plan) {
      newErrors.subscription_plan = 'Subscription plan is required';
    }

    // Numeric field validation
    if (formData.max_farmers && formData.max_farmers < 1) {
      newErrors.max_farmers = 'Maximum farmers must be at least 1';
    }

    if (formData.max_dealers && formData.max_dealers < 1) {
      newErrors.max_dealers = 'Maximum dealers must be at least 1';
    }

    if (formData.max_products && formData.max_products < 1) {
      newErrors.max_products = 'Maximum products must be at least 1';
    }

    if (formData.max_storage_gb && formData.max_storage_gb < 1) {
      newErrors.max_storage_gb = 'Storage limit must be at least 1 GB';
    }

    if (formData.max_api_calls_per_day && formData.max_api_calls_per_day < 1) {
      newErrors.max_api_calls_per_day = 'API calls limit must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Clean and prepare data
    const cleanedData = {
      ...formData,
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      owner_email: formData.owner_email?.trim() || '',
      owner_name: formData.owner_name?.trim() || '',
      owner_phone: formData.owner_phone?.trim() || undefined,
      business_registration: formData.business_registration?.trim() || undefined,
      subdomain: formData.subdomain?.trim() || undefined,
      custom_domain: formData.custom_domain?.trim() || undefined,
    };

    const success = await onSubmit(cleanedData);
    if (!success) {
      // Error handling is done by the parent component
    }
  };

  const handleInputChange = (field: keyof CreateTenantDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="business">Business Details</TabsTrigger>
          <TabsTrigger value="limits">Limits & Features</TabsTrigger>
          <TabsTrigger value="metadata">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase())}
                    className={errors.slug ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.slug && <p className="text-sm text-red-500 mt-1">{errors.slug}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Organization Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
                </div>

                <div>
                  <Label htmlFor="subscription_plan">Subscription Plan *</Label>
                  <Select
                    value={formData.subscription_plan}
                    onValueChange={(value) => handleInputChange('subscription_plan', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className={errors.subscription_plan ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionPlanOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.subscription_plan && <p className="text-sm text-red-500 mt-1">{errors.subscription_plan}</p>}
                </div>
              </div>

              {mode === 'create' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="owner_name">Administrator Name *</Label>
                      <Input
                        id="owner_name"
                        value={formData.owner_name}
                        onChange={(e) => handleInputChange('owner_name', e.target.value)}
                        className={errors.owner_name ? 'border-red-500' : ''}
                        disabled={isSubmitting}
                      />
                      {errors.owner_name && <p className="text-sm text-red-500 mt-1">{errors.owner_name}</p>}
                    </div>

                    <div>
                      <Label htmlFor="owner_email">Administrator Email *</Label>
                      <Input
                        id="owner_email"
                        type="email"
                        value={formData.owner_email}
                        onChange={(e) => handleInputChange('owner_email', e.target.value)}
                        className={errors.owner_email ? 'border-red-500' : ''}
                        disabled={isSubmitting}
                      />
                      {errors.owner_email && <p className="text-sm text-red-500 mt-1">{errors.owner_email}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="owner_phone">Administrator Phone</Label>
                    <Input
                      id="owner_phone"
                      value={formData.owner_phone}
                      onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_registration">Business Registration</Label>
                <Input
                  id="business_registration"
                  value={formData.business_registration}
                  onChange={(e) => handleInputChange('business_registration', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="established_date">Established Date</Label>
                <Input
                  id="established_date"
                  type="date"
                  value={formData.established_date}
                  onChange={(e) => handleInputChange('established_date', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subdomain">Subdomain</Label>
                  <Input
                    id="subdomain"
                    value={formData.subdomain}
                    onChange={(e) => handleInputChange('subdomain', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="custom_domain">Custom Domain</Label>
                  <Input
                    id="custom_domain"
                    value={formData.custom_domain}
                    onChange={(e) => handleInputChange('custom_domain', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Limits & Quotas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_farmers">Maximum Farmers</Label>
                  <Input
                    id="max_farmers"
                    type="number"
                    value={formData.max_farmers}
                    onChange={(e) => handleInputChange('max_farmers', parseInt(e.target.value) || 0)}
                    className={errors.max_farmers ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.max_farmers && <p className="text-sm text-red-500 mt-1">{errors.max_farmers}</p>}
                </div>

                <div>
                  <Label htmlFor="max_dealers">Maximum Dealers</Label>
                  <Input
                    id="max_dealers"
                    type="number"
                    value={formData.max_dealers}
                    onChange={(e) => handleInputChange('max_dealers', parseInt(e.target.value) || 0)}
                    className={errors.max_dealers ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.max_dealers && <p className="text-sm text-red-500 mt-1">{errors.max_dealers}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_products">Maximum Products</Label>
                  <Input
                    id="max_products"
                    type="number"
                    value={formData.max_products}
                    onChange={(e) => handleInputChange('max_products', parseInt(e.target.value) || 0)}
                    className={errors.max_products ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.max_products && <p className="text-sm text-red-500 mt-1">{errors.max_products}</p>}
                </div>

                <div>
                  <Label htmlFor="max_storage_gb">Maximum Storage (GB)</Label>
                  <Input
                    id="max_storage_gb"
                    type="number"
                    value={formData.max_storage_gb}
                    onChange={(e) => handleInputChange('max_storage_gb', parseInt(e.target.value) || 0)}
                    className={errors.max_storage_gb ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {errors.max_storage_gb && <p className="text-sm text-red-500 mt-1">{errors.max_storage_gb}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="max_api_calls_per_day">Maximum API Calls per Day</Label>
                <Input
                  id="max_api_calls_per_day"
                  type="number"
                  value={formData.max_api_calls_per_day}
                  onChange={(e) => handleInputChange('max_api_calls_per_day', parseInt(e.target.value) || 0)}
                  className={errors.max_api_calls_per_day ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.max_api_calls_per_day && <p className="text-sm text-red-500 mt-1">{errors.max_api_calls_per_day}</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subscription_start_date">Subscription Start Date</Label>
                  <Input
                    id="subscription_start_date"
                    type="date"
                    value={formData.subscription_start_date}
                    onChange={(e) => handleInputChange('subscription_start_date', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="subscription_end_date">Subscription End Date</Label>
                  <Input
                    id="subscription_end_date"
                    type="date"
                    value={formData.subscription_end_date}
                    onChange={(e) => handleInputChange('subscription_end_date', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="trial_ends_at">Trial End Date</Label>
                <Input
                  id="trial_ends_at"
                  type="date"
                  value={formData.trial_ends_at}
                  onChange={(e) => handleInputChange('trial_ends_at', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : mode === 'create' ? 'Create Tenant' : 'Update Tenant'}
        </Button>
      </div>
    </form>
  );
};
