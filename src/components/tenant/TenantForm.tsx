
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface TenantFormData {
  name: string;
  slug: string;
  type: string;
  status: string;
  subscription_plan: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  business_registration?: string;
  business_address?: any;
  established_date?: string;
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
  metadata?: any;
}

interface TenantFormProps {
  formData: TenantFormData;
  setFormData: (data: TenantFormData) => void;
  onSubmit: () => void;
  isEditing?: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  isEditing = false
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const updateField = (field: keyof TenantFormData, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Organization Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => updateField('slug', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Organization Type *</Label>
          <Select value={formData.type} onValueChange={(value) => updateField('type', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agri_company">Agriculture Company</SelectItem>
              <SelectItem value="dealer">Dealer</SelectItem>
              <SelectItem value="ngo">NGO</SelectItem>
              <SelectItem value="government">Government</SelectItem>
              <SelectItem value="university">University</SelectItem>
              <SelectItem value="sugar_factory">Sugar Factory</SelectItem>
              <SelectItem value="cooperative">Cooperative</SelectItem>
              <SelectItem value="insurance">Insurance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="subscription_plan">Subscription Plan *</Label>
        <Select value={formData.subscription_plan} onValueChange={(value) => updateField('subscription_plan', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Kisan_Basic">Kisan Basic</SelectItem>
            <SelectItem value="Shakti_Growth">Shakti Growth</SelectItem>
            <SelectItem value="AI_Enterprise">AI Enterprise</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="owner_name">Owner Name</Label>
          <Input
            id="owner_name"
            value={formData.owner_name || ''}
            onChange={(e) => updateField('owner_name', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="owner_email">Owner Email</Label>
          <Input
            id="owner_email"
            type="email"
            value={formData.owner_email || ''}
            onChange={(e) => updateField('owner_email', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="owner_phone">Owner Phone</Label>
        <Input
          id="owner_phone"
          value={formData.owner_phone || ''}
          onChange={(e) => updateField('owner_phone', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="max_farmers">Max Farmers</Label>
          <Input
            id="max_farmers"
            type="number"
            value={formData.max_farmers || ''}
            onChange={(e) => updateField('max_farmers', parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="max_dealers">Max Dealers</Label>
          <Input
            id="max_dealers"
            type="number"
            value={formData.max_dealers || ''}
            onChange={(e) => updateField('max_dealers', parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit">
          {isEditing ? 'Update Tenant' : 'Create Tenant'}
        </Button>
      </div>
    </form>
  );
};
