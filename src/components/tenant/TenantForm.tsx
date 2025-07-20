import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TenantFormData, FormErrors, subscriptionPlanOptions, tenantTypeOptions, tenantStatusOptions, SubscriptionPlan } from '@/types/tenant';
import { TenantService } from '@/services/tenantService';

interface TenantFormProps {
  formData: TenantFormData;
  setFormData: React.Dispatch<React.SetStateAction<TenantFormData>>;
  onSubmit: () => void;
  isEditing: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  isEditing
}) => {
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
        if (!formData.name?.trim()) newErrors.name = 'Organization name is required';
        if (!formData.slug?.trim()) newErrors.slug = 'Slug is required';
        if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
          newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
        }
        if (!formData.type) newErrors.type = 'Organization type is required';
        break;
      case 'contact':
        if (formData.owner_email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.owner_email)) {
          newErrors.owner_email = 'Invalid email format';
        }
        break;
      case 'subscription':
        if (!formData.subscription_plan) newErrors.subscription_plan = 'Subscription plan is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAllTabs = () => {
    const newErrors: FormErrors = {};

    // Basic tab validations
    if (!formData.name?.trim()) newErrors.name = 'Organization name is required';
    if (!formData.slug?.trim()) newErrors.slug = 'Slug is required';
    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }
    if (!formData.type) newErrors.type = 'Organization type is required';

    // Contact tab validations
    if (formData.owner_email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.owner_email)) {
      newErrors.owner_email = 'Invalid email format';
    }

    // Subscription tab validations
    if (!formData.subscription_plan) newErrors.subscription_plan = 'Subscription plan is required';

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
    console.log('Form submission started with data:', formData);
    
    if (!validateAllTabs()) {
      console.log('Form validation failed with errors:', errors);
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('Calling onSubmit function...');
      await onSubmit();
      console.log('onSubmit completed successfully');
    } catch (error) {
      console.error('Error in form submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof TenantFormData, value: any) => {
    console.log(`Field changed: ${field} = ${value}`);
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Auto-update limits when subscription plan changes
    if (field === 'subscription_plan') {
      const limits = TenantService.getPlanLimits(value as SubscriptionPlan);
      console.log('Updating limits for plan:', value, 'with limits:', limits);
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

  const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="flex items-center gap-1">
      {children}
      <span className="text-red-500 text-sm">*</span>
    </span>
  );

  const OptionalLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="flex items-center gap-1">
      {children}
      <span className="text-gray-400 text-sm">(Optional)</span>
    </span>
  );

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
              <Label htmlFor="name">
                <RequiredLabel>Organization Name</RequiredLabel>
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter organization name"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                <RequiredLabel>Slug</RequiredLabel>
              </Label>
              <Input
                id="slug"
                value={formData.slug || ''}
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
              <Label htmlFor="type">
                <RequiredLabel>Organization Type</RequiredLabel>
              </Label>
              <Select value={formData.type || ''} onValueChange={(value) => handleChange('type', value)}>
                <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
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
              {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">
                <OptionalLabel>Status</OptionalLabel>
              </Label>
              <Select value={formData.status || 'trial'} onValueChange={(value) => handleChange('status', value)}>
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
            <Label htmlFor="business_registration">
              <OptionalLabel>Business Registration</OptionalLabel>
            </Label>
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
              <Label htmlFor="owner_name">
                <OptionalLabel>Owner Name</OptionalLabel>
              </Label>
              <Input
                id="owner_name"
                value={formData.owner_name || ''}
                onChange={(e) => handleChange('owner_name', e.target.value)}
                placeholder="Enter owner name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_email">
                <OptionalLabel>Owner Email</OptionalLabel>
              </Label>
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
            <Label htmlFor="owner_phone">
              <OptionalLabel>Owner Phone</OptionalLabel>
            </Label>
            <Input
              id="owner_phone"
              value={formData.owner_phone || ''}
              onChange={(e) => handleChange('owner_phone', e.target.value)}
              placeholder="Enter owner phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_address">
              <OptionalLabel>Business Address</OptionalLabel>
            </Label>
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
              <Label htmlFor="subscription_plan">
                <RequiredLabel>Subscription Plan</RequiredLabel>
              </Label>
              <Select 
                value={formData.subscription_plan || ''} 
                onValueChange={(value) => {
                  console.log('Subscription plan selected:', value);
                  handleChange('subscription_plan', value);
                }}
              >
                <SelectTrigger className={errors.subscription_plan ? 'border-destructive' : ''}>
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
              {errors.subscription_plan && <p className="text-sm text-destructive">{errors.subscription_plan}</p>}
              {formData.subscription_plan && (
                <div className="text-sm text-muted-foreground mt-2">
                  <p>Plan Features:</p>
                  <ul className="list-disc list-inside ml-2">
                    {formData.subscription_plan === 'Kisan_Basic' && (
                      <>
                        <li>1,000 farmers</li>
                        <li>50 dealers</li>
                        <li>100 products</li>
                        <li>10GB storage</li>
                        <li>Basic features included</li>
                      </>
                    )}
                    {formData.subscription_plan === 'Shakti_Growth' && (
                      <>
                        <li>5,000 farmers</li>
                        <li>200 dealers</li>
                        <li>500 products</li>
                        <li>50GB storage</li>
                        <li>Advanced features included</li>
                      </>
                    )}
                    {formData.subscription_plan === 'AI_Enterprise' && (
                      <>
                        <li>20,000 farmers</li>
                        <li>1,000 dealers</li>
                        <li>2,000 products</li>
                        <li>200GB storage</li>
                        <li>All features included</li>
                      </>
                    )}
                    {formData.subscription_plan === 'custom' && (
                      <>
                        <li>50,000+ farmers</li>
                        <li>2,000+ dealers</li>
                        <li>5,000+ products</li>
                        <li>500GB+ storage</li>
                        <li>Custom features</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="established_date">
                <OptionalLabel>Established Date</OptionalLabel>
              </Label>
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
              <Label htmlFor="subscription_start_date">
                <OptionalLabel>Subscription Start</OptionalLabel>
              </Label>
              <Input
                id="subscription_start_date"
                type="datetime-local"
                value={formData.subscription_start_date ? formData.subscription_start_date.slice(0, 16) : ''}
                onChange={(e) => handleChange('subscription_start_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription_end_date">
                <OptionalLabel>Subscription End</OptionalLabel>
              </Label>
              <Input
                id="subscription_end_date"
                type="datetime-local"
                value={formData.subscription_end_date ? formData.subscription_end_date.slice(0, 16) : ''}
                onChange={(e) => handleChange('subscription_end_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trial_ends_at">
              <OptionalLabel>Trial Ends At</OptionalLabel>
            </Label>
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
              <Label htmlFor="max_farmers">
                <OptionalLabel>Max Farmers</OptionalLabel>
              </Label>
              <Input
                id="max_farmers"
                type="number"
                value={formData.max_farmers || 0}
                onChange={(e) => handleChange('max_farmers', parseInt(e.target.value) || 0)}
                placeholder="Maximum farmers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_dealers">
                <OptionalLabel>Max Dealers</OptionalLabel>
              </Label>
              <Input
                id="max_dealers"
                type="number"
                value={formData.max_dealers || 0}
                onChange={(e) => handleChange('max_dealers', parseInt(e.target.value) || 0)}
                placeholder="Maximum dealers"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_products">
                <OptionalLabel>Max Products</OptionalLabel>
              </Label>
              <Input
                id="max_products"
                type="number"
                value={formData.max_products || 0}
                onChange={(e) => handleChange('max_products', parseInt(e.target.value) || 0)}
                placeholder="Maximum products"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_storage_gb">
                <OptionalLabel>Max Storage (GB)</OptionalLabel>
              </Label>
              <Input
                id="max_storage_gb"
                type="number"
                value={formData.max_storage_gb || 0}
                onChange={(e) => handleChange('max_storage_gb', parseInt(e.target.value) || 0)}
                placeholder="Maximum storage in GB"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_api_calls_per_day">
              <OptionalLabel>Max API Calls Per Day</OptionalLabel>
            </Label>
            <Input
              id="max_api_calls_per_day"
              type="number"
              value={formData.max_api_calls_per_day || 0}
              onChange={(e) => handleChange('max_api_calls_per_day', parseInt(e.target.value) || 0)}
              placeholder="Maximum API calls per day"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subdomain">
                <OptionalLabel>Subdomain</OptionalLabel>
              </Label>
              <Input
                id="subdomain"
                value={formData.subdomain || ''}
                onChange={(e) => handleChange('subdomain', e.target.value)}
                placeholder="tenant-subdomain"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_domain">
                <OptionalLabel>Custom Domain</OptionalLabel>
              </Label>
              <Input
                id="custom_domain"
                value={formData.custom_domain || ''}
                onChange={(e) => handleChange('custom_domain', e.target.value)}
                placeholder="custom.domain.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadata">
              <OptionalLabel>Metadata (JSON)</OptionalLabel>
            </Label>
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
};
