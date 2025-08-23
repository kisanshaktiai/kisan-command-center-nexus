
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantFormData } from '@/types/tenant';

interface TenantFormBusinessProps {
  formData: TenantFormData;
  onFieldChange: (field: keyof TenantFormData, value: string | number | object) => void;
}

export const TenantFormBusiness: React.FC<TenantFormBusinessProps> = ({
  formData,
  onFieldChange
}) => {
  const handleAddressChange = (field: string, value: string) => {
    const currentAddress = typeof formData.business_address === 'object' && formData.business_address !== null
      ? formData.business_address
      : {};
    
    onFieldChange('business_address', {
      ...currentAddress,
      [field]: value
    });
  };

  // Safely get address values
  const getAddressValue = (field: string): string => {
    if (typeof formData.business_address === 'object' && formData.business_address !== null) {
      return (formData.business_address as any)[field] || '';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Legal and registration details for the organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_registration">Business Registration</Label>
              <Input
                id="business_registration"
                value={formData.business_registration || ''}
                onChange={(e) => onFieldChange('business_registration', e.target.value)}
                placeholder="Registration number, GST, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="established_date">Established Date</Label>
              <Input
                id="established_date"
                type="date"
                value={formData.established_date || ''}
                onChange={(e) => onFieldChange('established_date', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Address</CardTitle>
          <CardDescription>Physical address of the organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={getAddressValue('street')}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={getAddressValue('city')}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={getAddressValue('state')}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                placeholder="State or Province"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={getAddressValue('postal_code')}
                onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                placeholder="Postal code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={getAddressValue('country')}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domain Configuration</CardTitle>
          <CardDescription>Custom domain settings for the tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom_domain">Custom Domain</Label>
            <Input
              id="custom_domain"
              value={formData.custom_domain || ''}
              onChange={(e) => onFieldChange('custom_domain', e.target.value)}
              placeholder="example.com"
            />
            <p className="text-sm text-gray-500">
              Optional: Custom domain for white-label deployment
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
