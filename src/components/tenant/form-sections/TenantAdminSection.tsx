
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Mail, User } from 'lucide-react';
import { TenantFormData } from '@/types/tenant';

interface TenantAdminSectionProps {
  formData: TenantFormData;
  onFieldChange: (field: keyof TenantFormData, value: string | number) => void;
}

export const TenantAdminSection: React.FC<TenantAdminSectionProps> = ({
  formData,
  onFieldChange
}) => {
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

  const getSubdomainValidationIcon = () => {
    if (!formData.subdomain) return null;
    const isSubdomainValid = /^[a-z0-9-]+$/.test(formData.subdomain) && 
                            !formData.subdomain.startsWith('-') && 
                            !formData.subdomain.endsWith('-');
    return isSubdomainValid ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
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

        <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Email Notification Process</h4>
              <p className="text-sm text-blue-700 mt-1">
                After tenant creation, we'll automatically:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 pl-4">
                <li>• Check if the email already has an account</li>
                <li>• Create a secure admin account (if needed)</li>
                <li>• Generate temporary login credentials (for new accounts)</li>
                <li>• Send a branded welcome email with login instructions</li>
                <li>• Provide password reset options for first-time access</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
