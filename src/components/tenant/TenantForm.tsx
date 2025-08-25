import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CreateTenantDTO, UpdateTenantDTO, Tenant, TenantType, TenantStatus, SubscriptionPlan } from '@/types/tenant';
import { Loader2 } from 'lucide-react';
import { TenantAdminSection } from './form-sections/TenantAdminSection';

const createTenantSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  type: z.nativeEnum(TenantType),
  status: z.nativeEnum(TenantStatus).optional(),
  subscription_plan: z.nativeEnum(SubscriptionPlan),
  owner_name: z.string().min(1, 'Owner name is required'),
  owner_email: z.string().email('Invalid email address'),
  owner_phone: z.string().optional(),
  business_registration: z.string().optional(),
  subdomain: z.string().optional(),
  custom_domain: z.string().optional(),
  max_farmers: z.number().min(1).optional(),
  max_dealers: z.number().min(1).optional(),
  max_products: z.number().min(1).optional(),
  max_storage_gb: z.number().min(1).optional(),
  max_api_calls_per_day: z.number().min(1).optional(),
});

type TenantFormData = z.infer<typeof createTenantSchema>;

interface TenantFormProps {
  mode: 'create' | 'edit';
  tenant?: Tenant;
  onSubmit: (data: CreateTenantDTO | { id: string; data: UpdateTenantDTO }) => Promise<boolean>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({
  mode,
  tenant,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    reset
  } = useForm<TenantFormData>({
    resolver: zodResolver(createTenantSchema),
    mode: 'onChange',
    defaultValues: {
      name: tenant?.name || '',
      slug: tenant?.slug || '',
      type: tenant?.type || TenantType.AGRI_COMPANY,
      status: tenant?.status || TenantStatus.TRIAL,
      subscription_plan: tenant?.subscription_plan || SubscriptionPlan.KISAN_BASIC,
      owner_name: tenant?.owner_name || '',
      owner_email: tenant?.owner_email || '',
      owner_phone: tenant?.owner_phone || '',
      business_registration: tenant?.business_registration || '',
      subdomain: tenant?.subdomain || '',
      custom_domain: tenant?.custom_domain || '',
      max_farmers: tenant?.max_farmers || 1000,
      max_dealers: tenant?.max_dealers || 50,
      max_products: tenant?.max_products || 100,
      max_storage_gb: tenant?.max_storage_gb || 10,
      max_api_calls_per_day: tenant?.max_api_calls_per_day || 10000,
    }
  });

  const organizationName = watch('name');
  const formData = watch();

  // Auto-generate slug from organization name
  useEffect(() => {
    if (mode === 'create' && organizationName) {
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', slug);
    }
  }, [organizationName, mode, setValue]);

  const onFormSubmit = async (data: TenantFormData) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log('TenantForm: Submitting form data:', data);

      if (mode === 'create') {
        const createData: CreateTenantDTO = {
          name: data.name,
          slug: data.slug,
          type: data.type,
          status: data.status || TenantStatus.TRIAL,
          subscription_plan: data.subscription_plan,
          owner_name: data.owner_name,
          owner_email: data.owner_email,
          owner_phone: data.owner_phone || undefined,
          business_registration: data.business_registration || undefined,
          subdomain: data.subdomain || undefined,
          custom_domain: data.custom_domain || undefined,
          max_farmers: data.max_farmers,
          max_dealers: data.max_dealers,
          max_products: data.max_products,
          max_storage_gb: data.max_storage_gb,
          max_api_calls_per_day: data.max_api_calls_per_day,
        };
        
        console.log('TenantForm: Calling onSubmit with create data:', createData);
        const success = await onSubmit(createData);
        
        if (success) {
          console.log('TenantForm: Tenant created successfully');
          reset();
        }
      } else if (mode === 'edit' && tenant) {
        const updateData: UpdateTenantDTO = {
          name: data.name,
          status: data.status,
          subscription_plan: data.subscription_plan,
          owner_name: data.owner_name,
          owner_email: data.owner_email,
          owner_phone: data.owner_phone || undefined,
          business_registration: data.business_registration || undefined,
          subdomain: data.subdomain || undefined,
          custom_domain: data.custom_domain || undefined,
          max_farmers: data.max_farmers,
          max_dealers: data.max_dealers,
          max_products: data.max_products,
          max_storage_gb: data.max_storage_gb,
          max_api_calls_per_day: data.max_api_calls_per_day,
        };
        
        console.log('TenantForm: Calling onSubmit with update data:', updateData);
        await onSubmit({ id: tenant.id, data: updateData });
      }
    } catch (error) {
      console.error('TenantForm: Form submission error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = isSubmitting || isProcessing;

  // Convert errors to the format expected by TenantAdminSection
  const formErrors = Object.entries(errors).reduce((acc, [key, error]) => {
    if (error?.message) {
      acc[key] = [error.message];
    }
    return acc;
  }, {} as Record<string, string[]>);

  const handleFieldChange = (field: string, value: string | number) => {
    setValue(field as keyof TenantFormData, value);
  };

  // Prepare admin section data with proper typing
  const adminSectionData = {
    owner_name: formData.owner_name || '',
    owner_email: formData.owner_email || '',
    owner_phone: formData.owner_phone || '',
    business_registration: formData.business_registration || '',
    subdomain: formData.subdomain || '',
    custom_domain: formData.custom_domain || '',
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter organization name"
                disabled={isDisabled}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                {...register('slug')}
                placeholder="organization-slug"
                disabled={isDisabled || mode === 'edit'}
              />
              {errors.slug && (
                <p className="text-sm text-red-600">{errors.slug.message}</p>
              )}
              <p className="text-xs text-gray-500">
                URL-friendly identifier (lowercase, letters, numbers, hyphens only)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Organization Type *</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as TenantType)}
                disabled={isDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TenantType.AGRI_COMPANY}>Agricultural Company</SelectItem>
                  <SelectItem value={TenantType.DEALER}>Dealer</SelectItem>
                  <SelectItem value={TenantType.NGO}>NGO</SelectItem>
                  <SelectItem value={TenantType.GOVERNMENT}>Government</SelectItem>
                  <SelectItem value={TenantType.UNIVERSITY}>University</SelectItem>
                  <SelectItem value={TenantType.SUGAR_FACTORY}>Sugar Factory</SelectItem>
                  <SelectItem value={TenantType.COOPERATIVE}>Cooperative</SelectItem>
                  <SelectItem value={TenantType.INSURANCE}>Insurance</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as TenantStatus)}
                disabled={isDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TenantStatus.TRIAL}>Trial</SelectItem>
                  <SelectItem value={TenantStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={TenantStatus.SUSPENDED}>Suspended</SelectItem>
                  <SelectItem value={TenantStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription_plan">Subscription Plan *</Label>
              <Select
                value={watch('subscription_plan')}
                onValueChange={(value) => setValue('subscription_plan', value as SubscriptionPlan)}
                disabled={isDisabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SubscriptionPlan.KISAN_BASIC}>Kisan – Starter</SelectItem>
                  <SelectItem value={SubscriptionPlan.SHAKTI_GROWTH}>Shakti – Growth</SelectItem>
                  <SelectItem value={SubscriptionPlan.AI_ENTERPRISE}>AI – Enterprise</SelectItem>
                  <SelectItem value={SubscriptionPlan.CUSTOM}>Custom Plan</SelectItem>
                </SelectContent>
              </Select>
              {errors.subscription_plan && (
                <p className="text-sm text-red-600">{errors.subscription_plan.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Owner Information */}
      <TenantAdminSection 
        formData={adminSectionData}
        onFieldChange={handleFieldChange}
        errors={formErrors}
      />

      {/* Limits Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_farmers">Max Farmers</Label>
              <Input
                id="max_farmers"
                type="number"
                {...register('max_farmers', { valueAsNumber: true })}
                disabled={isDisabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_dealers">Max Dealers</Label>
              <Input
                id="max_dealers"
                type="number"
                {...register('max_dealers', { valueAsNumber: true })}
                disabled={isDisabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_products">Max Products</Label>
              <Input
                id="max_products"
                type="number"
                {...register('max_products', { valueAsNumber: true })}
                disabled={isDisabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_storage_gb">Max Storage (GB)</Label>
              <Input
                id="max_storage_gb"
                type="number"
                {...register('max_storage_gb', { valueAsNumber: true })}
                disabled={isDisabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_api_calls_per_day">Max API Calls/Day</Label>
              <Input
                id="max_api_calls_per_day"
                type="number"
                {...register('max_api_calls_per_day', { valueAsNumber: true })}
                disabled={isDisabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isDisabled}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isDisabled || !isValid}
        >
          {isDisabled && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {mode === 'create' ? 'Create Tenant' : 'Update Tenant'}
        </Button>
      </div>
    </form>
  );
};
