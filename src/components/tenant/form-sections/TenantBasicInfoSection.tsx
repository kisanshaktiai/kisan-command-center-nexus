
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantFormData } from '@/types/tenant';

interface TenantBasicInfoSectionProps {
  formData: TenantFormData;
  onFieldChange: (field: keyof TenantFormData, value: string | number) => void;
}

export const TenantBasicInfoSection: React.FC<TenantBasicInfoSectionProps> = ({
  formData,
  onFieldChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>Basic information about the tenant organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder="Enter organization name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Organization Type *</Label>
            <Select value={formData.type || ''} onValueChange={(value) => onFieldChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization type" />
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subscription_plan">Subscription Plan *</Label>
            <Select value={formData.subscription_plan || ''} onValueChange={(value) => onFieldChange('subscription_plan', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select subscription plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kisan_Basic">Kisan – Starter</SelectItem>
                <SelectItem value="Shakti_Growth">Shakti – Growth</SelectItem>
                <SelectItem value="AI_Enterprise">AI – Enterprise</SelectItem>
                <SelectItem value="custom">Custom Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status || 'trial'} onValueChange={(value) => onFieldChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
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
      </CardContent>
    </Card>
  );
};
