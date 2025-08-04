
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useLeadPermissions } from '@/hooks/useLeadPermissions';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import type { Lead, CustomFieldValue, CustomFieldConfig } from '@/types/leads';

interface DynamicLeadFormProps {
  lead?: Lead;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DynamicLeadForm: React.FC<DynamicLeadFormProps> = ({
  lead,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { currentTenant } = useMultiTenant();
  const { permissions, getFieldPermissions } = useLeadPermissions();
  const { data: customFields = [] } = useCustomFields(currentTenant?.id);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      contact_name: lead?.contact_name || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      organization_name: lead?.organization_name || '',
      source: lead?.source || '',
      source_id: lead?.source_id || '',
      campaign_id: lead?.campaign_id || '',
      priority: lead?.priority || 'medium',
      notes: lead?.notes || '',
    },
  });

  // Initialize custom field values
  useEffect(() => {
    if (lead?.custom_fields) {
      const values = lead.custom_fields.reduce((acc, field) => {
        acc[field.field_name] = field.value;
        return acc;
      }, {} as Record<string, any>);
      setCustomFieldValues(values);
    }
  }, [lead]);

  const handleFormSubmit = async (data: any) => {
    // Convert custom field values to the expected format
    const customFields: CustomFieldValue[] = customFields.map(field => ({
      field_name: field.field_name,
      field_type: field.field_type,
      value: customFieldValues[field.field_name],
      label: field.field_label,
    })).filter(field => field.value !== undefined && field.value !== '');

    const submitData = {
      ...data,
      custom_fields: customFields,
    };

    await onSubmit(submitData);
  };

  const renderCustomField = (field: CustomFieldConfig) => {
    const fieldPermissions = getFieldPermissions(field.field_name);
    
    if (!fieldPermissions.canView) return null;

    const value = customFieldValues[field.field_name] || '';
    const isDisabled = !fieldPermissions.canEdit || isLoading;

    const updateValue = (newValue: any) => {
      setCustomFieldValues(prev => ({
        ...prev,
        [field.field_name]: newValue,
      }));
    };

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type={field.field_type}
              value={value}
              onChange={(e) => updateValue(e.target.value)}
              disabled={isDisabled}
              placeholder={`Enter ${field.field_label.toLowerCase()}`}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type="number"
              value={value}
              onChange={(e) => updateValue(Number(e.target.value))}
              disabled={isDisabled}
              placeholder={`Enter ${field.field_label.toLowerCase()}`}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type="date"
              value={value}
              onChange={(e) => updateValue(e.target.value)}
              disabled={isDisabled}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.field_name}
              value={value}
              onChange={(e) => updateValue(e.target.value)}
              disabled={isDisabled}
              placeholder={`Enter ${field.field_label.toLowerCase()}`}
              rows={3}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={updateValue}
              disabled={isDisabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.field_label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.items?.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.field_name}
              checked={Boolean(value)}
              onCheckedChange={updateValue}
              disabled={isDisabled}
            />
            <Label htmlFor={field.field_name}>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        );

      default:
        return null;
    }
  };

  if (!permissions.canCreate && !lead) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            You don't have permission to create leads.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!permissions.canUpdate && lead) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            You don't have permission to edit leads.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {lead ? 'Edit Lead' : 'Create New Lead'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Core Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">
                Contact Name <span className="text-red-500">*</span>
              </Label>
              <Input
                {...register('contact_name', { required: 'Contact name is required' })}
                disabled={isLoading}
              />
              {errors.contact_name && (
                <p className="text-red-500 text-sm">{errors.contact_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                {...register('phone')}
                type="tel"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization_name">Organization</Label>
              <Input
                {...register('organization_name')}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                {...register('source')}
                disabled={isLoading}
                placeholder="Website, referral, etc."
              />
            </div>

            {permissions.canViewSensitiveFields && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="source_id">Source ID</Label>
                  <Input
                    {...register('source_id')}
                    disabled={isLoading}
                    placeholder="Campaign tracking ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign_id">Campaign ID</Label>
                  <Input
                    {...register('campaign_id')}
                    disabled={isLoading}
                    placeholder="Marketing campaign ID"
                  />
                </div>
              </>
            )}
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-t pt-4">
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map(renderCustomField)}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              {...register('notes')}
              disabled={isLoading}
              rows={4}
              placeholder="Additional notes or comments about this lead..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (lead ? 'Update Lead' : 'Create Lead')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
