
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tenant, UpdateTenantDTO, TenantStatus, SubscriptionPlan } from '@/types/tenant';
import { tenantStatusOptions, subscriptionPlanOptions } from '@/types/tenant';

interface TenantEditModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: UpdateTenantDTO) => Promise<boolean>;
  isSubmitting?: boolean;
}

export const TenantEditModal: React.FC<TenantEditModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSave,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<UpdateTenantDTO>({
    name: '',
    status: 'active' as TenantStatus,
    subscription_plan: 'Kisan_Basic' as SubscriptionPlan,
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        status: tenant.status,
        subscription_plan: tenant.subscription_plan,
        owner_phone: tenant.owner_phone || '',
        business_registration: tenant.business_registration || '',
        established_date: tenant.established_date || '',
        max_farmers: tenant.max_farmers || 1000,
        max_dealers: tenant.max_dealers || 50,
        max_products: tenant.max_products || 100,
        max_storage_gb: tenant.max_storage_gb || 10,
        max_api_calls_per_day: tenant.max_api_calls_per_day || 10000,
        subdomain: tenant.subdomain || '',
        custom_domain: tenant.custom_domain || '',
      });
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    const success = await onSave(tenant.id, formData);
    if (success) {
      onClose();
    }
  };

  const handleInputChange = (field: keyof UpdateTenantDTO, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tenant: {tenant.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subscription_plan">Subscription Plan</Label>
              <Select
                value={formData.subscription_plan}
                onValueChange={(value) => handleInputChange('subscription_plan', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlanOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner_phone">Owner Phone</Label>
                <Input
                  id="owner_phone"
                  value={formData.owner_phone || ''}
                  onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="business_registration">Business Registration</Label>
                <Input
                  id="business_registration"
                  value={formData.business_registration || ''}
                  onChange={(e) => handleInputChange('business_registration', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="established_date">Established Date</Label>
              <Input
                id="established_date"
                type="date"
                value={formData.established_date || ''}
                onChange={(e) => handleInputChange('established_date', e.target.value)}
              />
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Subscription Limits</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_farmers">Max Farmers</Label>
                <Input
                  id="max_farmers"
                  type="number"
                  value={formData.max_farmers || ''}
                  onChange={(e) => handleInputChange('max_farmers', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="max_dealers">Max Dealers</Label>
                <Input
                  id="max_dealers"
                  type="number"
                  value={formData.max_dealers || ''}
                  onChange={(e) => handleInputChange('max_dealers', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="max_products">Max Products</Label>
                <Input
                  id="max_products"
                  type="number"
                  value={formData.max_products || ''}
                  onChange={(e) => handleInputChange('max_products', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="max_storage_gb">Max Storage (GB)</Label>
                <Input
                  id="max_storage_gb"
                  type="number"
                  value={formData.max_storage_gb || ''}
                  onChange={(e) => handleInputChange('max_storage_gb', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="max_api_calls_per_day">Max API Calls/Day</Label>
                <Input
                  id="max_api_calls_per_day"
                  type="number"
                  value={formData.max_api_calls_per_day || ''}
                  onChange={(e) => handleInputChange('max_api_calls_per_day', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Domain Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Domain Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subdomain">Subdomain</Label>
                <Input
                  id="subdomain"
                  value={formData.subdomain || ''}
                  onChange={(e) => handleInputChange('subdomain', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="custom_domain">Custom Domain</Label>
                <Input
                  id="custom_domain"
                  value={formData.custom_domain || ''}
                  onChange={(e) => handleInputChange('custom_domain', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
