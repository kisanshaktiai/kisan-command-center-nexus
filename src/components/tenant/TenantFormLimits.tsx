
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantFormData } from '@/types/tenant';

interface TenantFormLimitsProps {
  formData: TenantFormData;
  onFieldChange: (field: keyof TenantFormData, value: string | number) => void;
}

export const TenantFormLimits: React.FC<TenantFormLimitsProps> = ({
  formData,
  onFieldChange
}) => {
  const getPlanLimits = (plan: string) => {
    const limits = {
      Kisan_Basic: { farmers: 1000, dealers: 50, products: 100, storage: 10, api_calls: 10000 },
      Shakti_Growth: { farmers: 5000, dealers: 200, products: 500, storage: 50, api_calls: 50000 },
      AI_Enterprise: { farmers: 20000, dealers: 1000, products: 2000, storage: 200, api_calls: 200000 },
      custom: { farmers: 50000, dealers: 2000, products: 5000, storage: 500, api_calls: 500000 },
    };
    return limits[plan as keyof typeof limits] || limits.Kisan_Basic;
  };

  const defaultLimits = getPlanLimits(formData.subscription_plan);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Dates</CardTitle>
          <CardDescription>Manage subscription and trial periods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subscription_start_date">Subscription Start Date</Label>
              <Input
                id="subscription_start_date"
                type="date"
                value={formData.subscription_start_date || ''}
                onChange={(e) => onFieldChange('subscription_start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription_end_date">Subscription End Date</Label>
              <Input
                id="subscription_end_date"
                type="date"
                value={formData.subscription_end_date || ''}
                onChange={(e) => onFieldChange('subscription_end_date', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trial_ends_at">Trial End Date</Label>
            <Input
              id="trial_ends_at"
              type="date"
              value={formData.trial_ends_at || ''}
              onChange={(e) => onFieldChange('trial_ends_at', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resource Limits</CardTitle>
          <CardDescription>
            Configure resource limits for this tenant. Leave empty to use plan defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_farmers">Maximum Farmers</Label>
              <Input
                id="max_farmers"
                type="number"
                value={formData.max_farmers || ''}
                onChange={(e) => onFieldChange('max_farmers', parseInt(e.target.value) || 0)}
                placeholder={`Default: ${defaultLimits.farmers.toLocaleString()}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_dealers">Maximum Dealers</Label>
              <Input
                id="max_dealers"
                type="number"
                value={formData.max_dealers || ''}
                onChange={(e) => onFieldChange('max_dealers', parseInt(e.target.value) || 0)}
                placeholder={`Default: ${defaultLimits.dealers.toLocaleString()}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_products">Maximum Products</Label>
              <Input
                id="max_products"
                type="number"
                value={formData.max_products || ''}
                onChange={(e) => onFieldChange('max_products', parseInt(e.target.value) || 0)}
                placeholder={`Default: ${defaultLimits.products.toLocaleString()}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_storage_gb">Storage Limit (GB)</Label>
              <Input
                id="max_storage_gb"
                type="number"
                value={formData.max_storage_gb || ''}
                onChange={(e) => onFieldChange('max_storage_gb', parseInt(e.target.value) || 0)}
                placeholder={`Default: ${defaultLimits.storage}GB`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_api_calls_per_day">API Calls per Day</Label>
            <Input
              id="max_api_calls_per_day"
              type="number"
              value={formData.max_api_calls_per_day || ''}
              onChange={(e) => onFieldChange('max_api_calls_per_day', parseInt(e.target.value) || 0)}
              placeholder={`Default: ${defaultLimits.api_calls.toLocaleString()}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
