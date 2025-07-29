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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Limits</CardTitle>
        <CardDescription>Set resource limits for this tenant</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max_farmers">Max Farmers</Label>
            <Input
              id="max_farmers"
              type="number"
              value={formData.max_farmers || ''}
              onChange={(e) => onFieldChange('max_farmers', parseInt(e.target.value) || 0)}
              placeholder="1000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_dealers">Max Dealers</Label>
            <Input
              id="max_dealers"
              type="number"
              value={formData.max_dealers || ''}
              onChange={(e) => onFieldChange('max_dealers', parseInt(e.target.value) || 0)}
              placeholder="50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_products">Max Products</Label>
            <Input
              id="max_products"
              type="number"
              value={formData.max_products || ''}
              onChange={(e) => onFieldChange('max_products', parseInt(e.target.value) || 0)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_storage_gb">Max Storage (GB)</Label>
            <Input
              id="max_storage_gb"
              type="number"
              value={formData.max_storage_gb || ''}
              onChange={(e) => onFieldChange('max_storage_gb', parseInt(e.target.value) || 0)}
              placeholder="10"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};