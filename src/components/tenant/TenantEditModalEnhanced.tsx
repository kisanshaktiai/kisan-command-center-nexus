import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Calendar, Building, Mail, Phone, FileText, Globe, Users, Database, Activity } from 'lucide-react';
import { Tenant, UpdateTenantDTO, tenantStatusOptions, subscriptionPlanOptions, TenantStatus, SubscriptionPlan } from '@/types/tenant';

interface TenantEditModalEnhancedProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: UpdateTenantDTO) => Promise<boolean>;
  isSubmitting?: boolean;
}

export const TenantEditModalEnhanced: React.FC<TenantEditModalEnhancedProps> = ({
  tenant,
  isOpen,
  onClose,
  onSave,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<UpdateTenantDTO>({});
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        type: tenant.type,
        status: tenant.status,
        subscription_plan: tenant.subscription_plan,
        owner_name: tenant.owner_name || '',
        owner_email: tenant.owner_email || '',
        owner_phone: tenant.owner_phone || '',
        business_registration: tenant.business_registration || '',
        business_address: tenant.business_address || {},
        established_date: tenant.established_date || '',
        subscription_start_date: tenant.subscription_start_date || '',
        subscription_end_date: tenant.subscription_end_date || '',
        trial_ends_at: tenant.trial_ends_at || '',
        max_farmers: tenant.max_farmers || 0,
        max_dealers: tenant.max_dealers || 0,
        max_products: tenant.max_products || 0,
        max_storage_gb: tenant.max_storage_gb || 0,
        max_api_calls_per_day: tenant.max_api_calls_per_day || 0,
        subdomain: tenant.subdomain || '',
        custom_domain: tenant.custom_domain || '',
        metadata: tenant.metadata || {},
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

  // Fix the symbol index error by using string keys
  const handleNestedInputChange = (parentField: string, childField: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField as keyof UpdateTenantDTO] as any || {}),
        [childField]: value
      }
    }));
  };

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tenant: {tenant.name}</DialogTitle>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="flex space-x-4">
          <Button variant={activeTab === 'basic' ? 'default' : 'outline'} onClick={() => setActiveTab('basic')}>
            Basic Info
          </Button>
          <Button variant={activeTab === 'contact' ? 'default' : 'outline'} onClick={() => setActiveTab('contact')}>
            Contact Details
          </Button>
          <Button variant={activeTab === 'limits' ? 'default' : 'outline'} onClick={() => setActiveTab('limits')}>
            Subscription Limits
          </Button>
          <Button variant={activeTab === 'domain' ? 'default' : 'outline'} onClick={() => setActiveTab('domain')}>
            Domain Settings
          </Button>
        </div>

        <Separator className="my-4" />

        <form onSubmit={handleSubmit} className="space-y-6">
          {activeTab === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Update core tenant details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    value={formData.status as TenantStatus}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
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
                <div>
                  <Label htmlFor="subscription_plan">Subscription Plan</Label>
                  <Select
                    value={formData.subscription_plan as SubscriptionPlan}
                    onValueChange={(value) => handleInputChange('subscription_plan', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
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
              </CardContent>
            </Card>
          )}

          {activeTab === 'contact' && (
            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
                <CardDescription>Manage contact information for the tenant.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="owner_name">Owner Name</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name || ''}
                    onChange={(e) => handleInputChange('owner_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="owner_email">Owner Email</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={formData.owner_email || ''}
                    onChange={(e) => handleInputChange('owner_email', e.target.value)}
                  />
                </div>
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
                <div>
                  <Label htmlFor="established_date">Established Date</Label>
                  <Input
                    id="established_date"
                    type="date"
                    value={formData.established_date || ''}
                    onChange={(e) => handleInputChange('established_date', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'limits' && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription Limits</CardTitle>
                <CardDescription>Set limits for various tenant resources.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="max_farmers">Max Farmers</Label>
                  <Input
                    id="max_farmers"
                    type="number"
                    value={formData.max_farmers || 0}
                    onChange={(e) => handleInputChange('max_farmers', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="max_dealers">Max Dealers</Label>
                  <Input
                    id="max_dealers"
                    type="number"
                    value={formData.max_dealers || 0}
                    onChange={(e) => handleInputChange('max_dealers', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="max_products">Max Products</Label>
                  <Input
                    id="max_products"
                    type="number"
                    value={formData.max_products || 0}
                    onChange={(e) => handleInputChange('max_products', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="max_storage_gb">Max Storage (GB)</Label>
                  <Input
                    id="max_storage_gb"
                    type="number"
                    value={formData.max_storage_gb || 0}
                    onChange={(e) => handleInputChange('max_storage_gb', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="max_api_calls_per_day">Max API Calls/Day</Label>
                  <Input
                    id="max_api_calls_per_day"
                    type="number"
                    value={formData.max_api_calls_per_day || 0}
                    onChange={(e) => handleInputChange('max_api_calls_per_day', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'domain' && (
            <Card>
              <CardHeader>
                <CardTitle>Domain Settings</CardTitle>
                <CardDescription>Configure domain settings for the tenant.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
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
