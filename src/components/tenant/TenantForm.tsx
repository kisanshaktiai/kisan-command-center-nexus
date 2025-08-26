import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreateTenantDTO, UpdateTenantDTO } from '@/types/tenant';
import { TenantType, TenantStatus, SubscriptionPlan, tenantTypeOptions, tenantStatusOptions, subscriptionPlanOptions } from '@/types/tenant';
import { Building2, Users, Sprout, GraduationCap, Shield, Factory, Handshake, Heart, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface TenantFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<CreateTenantDTO>;
  onSubmit: (data: CreateTenantDTO | UpdateTenantDTO) => Promise<boolean>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// Icon mapping for organization types
const typeIcons = {
  'agri_company': Building2,
  'dealer': Users,
  'ngo': Heart,
  'government': Shield,
  'university': GraduationCap,
  'sugar_factory': Factory,
  'cooperative': Handshake,
  'insurance': Shield,
};

// Icon mapping for subscription plans
const planIcons = {
  'Kisan_Basic': Sprout,
  'Shakti_Growth': Building2,
  'AI_Enterprise': Factory,
  'custom': Shield,
};

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
  const [currentTab, setCurrentTab] = useState('basic');

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

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Building2 },
    { id: 'business', label: 'Business Details', icon: Users },
    { id: 'limits', label: 'Limits & Features', icon: Shield },
    { id: 'metadata', label: 'Advanced', icon: CheckCircle2 }
  ];

  const currentTabIndex = tabs.findIndex(tab => tab.id === currentTab);

  const handleNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setCurrentTab(tabs[currentTabIndex + 1].id);
    }
  };

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setCurrentTab(tabs[currentTabIndex - 1].id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-8">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = tab.id === currentTab;
            const isCompleted = index < currentTabIndex;
            
            return (
              <div key={tab.id} className="flex items-center flex-1">
                <div 
                  className={`flex items-center space-x-2 cursor-pointer transition-all duration-200 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                  onClick={() => setCurrentTab(tab.id)}
                >
                  <div className={`rounded-full p-2 border-2 transition-all duration-200 ${
                    isActive ? 'border-primary bg-primary/10' : 
                    isCompleted ? 'border-green-600 bg-green-50' : 
                    'border-muted-foreground/30'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{tab.label}</span>
                </div>
                {index < tabs.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 transition-all duration-200 ${
                    isCompleted ? 'bg-green-600' : 'bg-muted-foreground/20'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsContent value="basic" className="space-y-6 mt-0">
            <Card className="border-none shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">Organization Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`h-11 ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                      disabled={isSubmitting}
                      placeholder="Enter organization name"
                    />
                    {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-sm font-semibold">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase())}
                      className={`h-11 ${errors.slug ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                      disabled={isSubmitting}
                      placeholder="organization-slug"
                    />
                    {errors.slug && <p className="text-sm text-red-500 mt-1">{errors.slug}</p>}
                  </div>
                </div>

                {/* Organization Type Selection */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Organization Type *</Label>
                  <RadioGroup
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  >
                    {tenantTypeOptions.map((option) => {
                      const Icon = typeIcons[option.value as keyof typeof typeIcons] || Building2;
                      return (
                        <div key={option.value} className="relative">
                          <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                          <Label
                            htmlFor={option.value}
                            className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                              formData.type === option.value 
                                ? 'border-primary bg-primary/5 shadow-md' 
                                : 'border-muted-foreground/20 hover:border-primary/30'
                            }`}
                          >
                            <Icon className={`h-8 w-8 mb-2 ${
                              formData.type === option.value ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <span className="text-sm font-medium">{option.label}</span>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
                </div>

                {/* Subscription Plan Selection */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Subscription Plan *</Label>
                  <RadioGroup
                    value={formData.subscription_plan}
                    onValueChange={(value) => handleInputChange('subscription_plan', value)}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  >
                    {subscriptionPlanOptions.map((option) => {
                      const Icon = planIcons[option.value as keyof typeof planIcons] || Building2;
                      return (
                        <div key={option.value} className="relative">
                          <RadioGroupItem value={option.value} id={`plan-${option.value}`} className="sr-only" />
                          <Label
                            htmlFor={`plan-${option.value}`}
                            className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                              formData.subscription_plan === option.value 
                                ? 'border-primary bg-primary/5 shadow-md' 
                                : 'border-muted-foreground/20 hover:border-primary/30'
                            }`}
                          >
                            <Icon className={`h-8 w-8 mb-2 ${
                              formData.subscription_plan === option.value ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <span className="text-sm font-medium">{option.label}</span>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                  {errors.subscription_plan && <p className="text-sm text-red-500 mt-1">{errors.subscription_plan}</p>}
                </div>

                {mode === 'create' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="owner_name" className="text-sm font-semibold">Administrator Name *</Label>
                      <Input
                        id="owner_name"
                        value={formData.owner_name}
                        onChange={(e) => handleInputChange('owner_name', e.target.value)}
                        className={`h-11 ${errors.owner_name ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                        disabled={isSubmitting}
                        placeholder="Enter administrator name"
                      />
                      {errors.owner_name && <p className="text-sm text-red-500 mt-1">{errors.owner_name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_email" className="text-sm font-semibold">Administrator Email *</Label>
                      <Input
                        id="owner_email"
                        type="email"
                        value={formData.owner_email}
                        onChange={(e) => handleInputChange('owner_email', e.target.value)}
                        className={`h-11 ${errors.owner_email ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                        disabled={isSubmitting}
                        placeholder="admin@example.com"
                      />
                      {errors.owner_email && <p className="text-sm text-red-500 mt-1">{errors.owner_email}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="owner_phone" className="text-sm font-semibold">Administrator Phone</Label>
                      <Input
                        id="owner_phone"
                        value={formData.owner_phone}
                        onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                        className="h-11 focus-visible:ring-primary"
                        disabled={isSubmitting}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="space-y-6 mt-0">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="business_registration" className="text-sm font-semibold">Business Registration</Label>
                  <Input
                    id="business_registration"
                    value={formData.business_registration}
                    onChange={(e) => handleInputChange('business_registration', e.target.value)}
                    className="h-11 focus-visible:ring-primary"
                    disabled={isSubmitting}
                    placeholder="Enter registration number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="established_date" className="text-sm font-semibold">Established Date</Label>
                  <Input
                    id="established_date"
                    type="date"
                    value={formData.established_date}
                    onChange={(e) => handleInputChange('established_date', e.target.value)}
                    className="h-11 focus-visible:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="subdomain" className="text-sm font-semibold">Subdomain</Label>
                    <Input
                      id="subdomain"
                      value={formData.subdomain}
                      onChange={(e) => handleInputChange('subdomain', e.target.value)}
                      className="h-11 focus-visible:ring-primary"
                      disabled={isSubmitting}
                      placeholder="your-subdomain"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom_domain" className="text-sm font-semibold">Custom Domain</Label>
                    <Input
                      id="custom_domain"
                      value={formData.custom_domain}
                      onChange={(e) => handleInputChange('custom_domain', e.target.value)}
                      className="h-11 focus-visible:ring-primary"
                      disabled={isSubmitting}
                      placeholder="yourdomain.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6 mt-0">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  Limits & Quotas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="max_farmers" className="text-sm font-semibold">Maximum Farmers</Label>
                    <Input
                      id="max_farmers"
                      type="number"
                      value={formData.max_farmers}
                      onChange={(e) => handleInputChange('max_farmers', parseInt(e.target.value) || 0)}
                      className={`h-11 ${errors.max_farmers ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                      disabled={isSubmitting}
                    />
                    {errors.max_farmers && <p className="text-sm text-red-500 mt-1">{errors.max_farmers}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_dealers" className="text-sm font-semibold">Maximum Dealers</Label>
                    <Input
                      id="max_dealers"
                      type="number"
                      value={formData.max_dealers}
                      onChange={(e) => handleInputChange('max_dealers', parseInt(e.target.value) || 0)}
                      className={`h-11 ${errors.max_dealers ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                      disabled={isSubmitting}
                    />
                    {errors.max_dealers && <p className="text-sm text-red-500 mt-1">{errors.max_dealers}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_products" className="text-sm font-semibold">Maximum Products</Label>
                    <Input
                      id="max_products"
                      type="number"
                      value={formData.max_products}
                      onChange={(e) => handleInputChange('max_products', parseInt(e.target.value) || 0)}
                      className={`h-11 ${errors.max_products ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                      disabled={isSubmitting}
                    />
                    {errors.max_products && <p className="text-sm text-red-500 mt-1">{errors.max_products}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_storage_gb" className="text-sm font-semibold">Maximum Storage (GB)</Label>
                    <Input
                      id="max_storage_gb"
                      type="number"
                      value={formData.max_storage_gb}
                      onChange={(e) => handleInputChange('max_storage_gb', parseInt(e.target.value) || 0)}
                      className={`h-11 ${errors.max_storage_gb ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                      disabled={isSubmitting}
                    />
                    {errors.max_storage_gb && <p className="text-sm text-red-500 mt-1">{errors.max_storage_gb}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_api_calls_per_day" className="text-sm font-semibold">Maximum API Calls per Day</Label>
                  <Input
                    id="max_api_calls_per_day"
                    type="number"
                    value={formData.max_api_calls_per_day}
                    onChange={(e) => handleInputChange('max_api_calls_per_day', parseInt(e.target.value) || 0)}
                    className={`h-11 ${errors.max_api_calls_per_day ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                    disabled={isSubmitting}
                  />
                  {errors.max_api_calls_per_day && <p className="text-sm text-red-500 mt-1">{errors.max_api_calls_per_day}</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-6 mt-0">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  Advanced Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="subscription_start_date" className="text-sm font-semibold">Subscription Start Date</Label>
                    <Input
                      id="subscription_start_date"
                      type="date"
                      value={formData.subscription_start_date}
                      onChange={(e) => handleInputChange('subscription_start_date', e.target.value)}
                      className="h-11 focus-visible:ring-primary"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subscription_end_date" className="text-sm font-semibold">Subscription End Date</Label>
                    <Input
                      id="subscription_end_date"
                      type="date"
                      value={formData.subscription_end_date}
                      onChange={(e) => handleInputChange('subscription_end_date', e.target.value)}
                      className="h-11 focus-visible:ring-primary"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trial_ends_at" className="text-sm font-semibold">Trial End Date</Label>
                  <Input
                    id="trial_ends_at"
                    type="date"
                    value={formData.trial_ends_at}
                    onChange={(e) => handleInputChange('trial_ends_at', e.target.value)}
                    className="h-11 focus-visible:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={currentTabIndex > 0 ? handlePrevTab : onCancel}
            disabled={isSubmitting}
            className="flex items-center gap-2 h-11 px-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentTabIndex > 0 ? 'Previous' : 'Cancel'}
          </Button>

          <div className="flex gap-3">
            {currentTabIndex < tabs.length - 1 ? (
              <Button
                type="button"
                onClick={handleNextTab}
                disabled={isSubmitting}
                className="flex items-center gap-2 h-11 px-6"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 h-11 px-6"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {mode === 'create' ? 'Create Tenant' : 'Update Tenant'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};
