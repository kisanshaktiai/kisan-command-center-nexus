
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Mail, User } from 'lucide-react';
import { TenantFormData } from '@/types/tenant';

interface TenantFormBasicProps {
  formData: TenantFormData;
  onFieldChange: (field: keyof TenantFormData, value: string | number) => void;
  isSlugValid: boolean;
  isSlugChecking: boolean;
  slugError: string | null;
}

export const TenantFormBasic: React.FC<TenantFormBasicProps> = ({
  formData,
  onFieldChange,
  isSlugValid,
  isSlugChecking,
  slugError
}) => {
  const getSlugValidationIcon = () => {
    if (!formData.slug) return null;
    if (isSlugChecking) return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
    if (isSlugValid) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getSubdomainValidationIcon = () => {
    if (!formData.subdomain) return null;
    // Basic validation for subdomain
    const isSubdomainValid = /^[a-z0-9-]+$/.test(formData.subdomain) && 
                            !formData.subdomain.startsWith('-') && 
                            !formData.subdomain.endsWith('-');
    return isSubdomainValid ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getEmailValidationIcon = () => {
    if (!formData.owner_email) return null;
    return validateEmail(formData.owner_email) ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
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
              <Label htmlFor="slug">Slug *</Label>
              <div className="relative">
                <Input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => onFieldChange('slug', e.target.value.toLowerCase())}
                  placeholder="organization-slug"
                  required
                  className={`pr-10 ${
                    slugError ? 'border-red-500' : 
                    isSlugValid ? 'border-green-500' : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {getSlugValidationIcon()}
                </div>
              </div>
              {slugError && (
                <p className="text-sm text-red-500">{slugError}</p>
              )}
              {isSlugValid && (
                <p className="text-sm text-green-500">Slug is available</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain *</Label>
              <div className="relative">
                <Input
                  id="subdomain"
                  value={formData.subdomain || ''}
                  onChange={(e) => onFieldChange('subdomain', e.target.value.toLowerCase())}
                  placeholder="mycompany"
                  required
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {getSubdomainValidationIcon()}
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {formData.subdomain && `https://${formData.subdomain}.yourdomain.com`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Administrator Account Setup
          </CardTitle>
          <CardDescription>
            These details will be used to create the tenant admin account. 
            <strong className="text-blue-700">A welcome email with login credentials will be sent automatically.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name" className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Administrator Name *
              </Label>
              <Input
                id="owner_name"
                value={formData.owner_name || ''}
                onChange={(e) => onFieldChange('owner_name', e.target.value)}
                placeholder="Enter administrator full name"
                required
              />
              <p className="text-xs text-muted-foreground">This person will be the primary tenant administrator</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_email" className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Administrator Email *
              </Label>
              <div className="relative">
                <Input
                  id="owner_email"
                  type="email"
                  value={formData.owner_email || ''}
                  onChange={(e) => onFieldChange('owner_email', e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className={`pr-10 ${
                    formData.owner_email && !validateEmail(formData.owner_email) ? 'border-red-500' : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {getEmailValidationIcon()}
                </div>
              </div>
              {formData.owner_email && !validateEmail(formData.owner_email) && (
                <p className="text-sm text-red-500">Please enter a valid email address</p>
              )}
              <p className="text-xs text-muted-foreground">Welcome email with login credentials will be sent here</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner_phone">Administrator Phone (Optional)</Label>
            <Input
              id="owner_phone"
              type="tel"
              value={formData.owner_phone || ''}
              onChange={(e) => onFieldChange('owner_phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Email Notification Process</h4>
                <p className="text-sm text-blue-700 mt-1">
                  After tenant creation, we'll automatically:
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 pl-4">
                  <li>• Create a secure admin account</li>
                  <li>• Generate temporary login credentials</li>
                  <li>• Send a welcome email with login instructions</li>
                  <li>• Provide password reset options for first-time access</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
