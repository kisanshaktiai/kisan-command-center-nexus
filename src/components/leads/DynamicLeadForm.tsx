
import React, { useState, useEffect } from 'react';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { useLeadService } from '@/hooks/useLeadService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Lead, CustomFieldValue } from '@/types/leads';

interface DynamicLeadFormProps {
  lead?: Lead;
  onSubmit: (leadData: any) => void;
  onCancel: () => void;
}

export const DynamicLeadForm: React.FC<DynamicLeadFormProps> = ({
  lead,
  onSubmit,
  onCancel,
}) => {
  const multiTenant = useMultiTenant();
  const tenantId = multiTenant?.tenant_id || null;
  const { customFields, loading: fieldsLoading } = useCustomFields(tenantId);
  const { createLead, updateLead, isLoading } = useLeadService();
  
  // Form state
  const [formData, setFormData] = useState({
    contact_name: lead?.contact_name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    organization_name: lead?.organization_name || '',
    source: lead?.source || '',
    priority: lead?.priority || 'medium' as const,
    notes: lead?.notes || '',
    custom_fields: lead?.custom_fields || [] as CustomFieldValue[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize custom fields if creating new lead
  useEffect(() => {
    if (!lead && customFields.length > 0) {
      const initialCustomFields: CustomFieldValue[] = customFields.map(field => ({
        field_name: field.field_name,
        field_type: field.field_type,
        value: getDefaultValue(field.field_type),
        label: field.field_label || field.field_name,
      }));
      
      setFormData(prev => ({
        ...prev,
        custom_fields: initialCustomFields,
      }));
    }
  }, [customFields, lead]);

  const getDefaultValue = (fieldType: string) => {
    switch (fieldType) {
      case 'checkbox':
        return false;
      case 'number':
        return 0;
      case 'multiselect':
        return [];
      default:
        return '';
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Custom field validation
    customFields.forEach(field => {
      if (field.is_required) {
        const customFieldValue = formData.custom_fields.find(
          cf => cf.field_name === field.field_name
        );
        
        if (!customFieldValue || !customFieldValue.value) {
          newErrors[`custom_${field.field_name}`] = `${field.field_label || field.field_name} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.map(cf =>
        cf.field_name === fieldName ? { ...cf, value } : cf
      ),
    }));
  };

  const renderCustomField = (field: any) => {
    const customFieldValue = formData.custom_fields.find(
      cf => cf.field_name === field.field_name
    );
    const value = customFieldValue?.value || getDefaultValue(field.field_type);
    const error = errors[`custom_${field.field_name}`];

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_name}>
              {field.field_label || field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
              value={value}
              onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_name}>
              {field.field_label || field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.field_name}
              value={value}
              onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_name}>
              {field.field_label || field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type="number"
              value={value}
              onChange={(e) => handleCustomFieldChange(field.field_name, Number(e.target.value))}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'select':
        const options = field.options?.values || [];
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_name}>
              {field.field_label || field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleCustomFieldChange(field.field_name, val)}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={field.id}>
            <Label htmlFor={field.field_name}>
              {field.field_label || field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.field_name}
              type="date"
              value={value}
              onChange={(e) => handleCustomFieldChange(field.field_name, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <input
              id={field.field_name}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleCustomFieldChange(field.field_name, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor={field.field_name}>
              {field.field_label || field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const leadData = {
        ...formData,
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
      };

      if (lead) {
        await updateLead(lead.id, leadData);
      } else {
        await createLead(leadData);
      }
      
      onSubmit(leadData);
    } catch (error) {
      console.error('Failed to save lead:', error);
    }
  };

  if (fieldsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">Loading form...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lead ? 'Edit Lead' : 'Create New Lead'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Standard Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name">
                Contact Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => handleInputChange('contact_name', e.target.value)}
                className={errors.contact_name ? 'border-red-500' : ''}
              />
              {errors.contact_name && (
                <p className="text-red-500 text-sm mt-1">{errors.contact_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="organization_name">Organization</Label>
              <Input
                id="organization_name"
                value={formData.organization_name}
                onChange={(e) => handleInputChange('organization_name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => handleInputChange('source', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
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
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Custom Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields
                  .filter(field => field.is_active)
                  .sort((a, b) => a.field_order - b.field_order)
                  .map(renderCustomField)}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
