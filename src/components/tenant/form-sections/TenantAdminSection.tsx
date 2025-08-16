import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Mail, User, AlertTriangle } from 'lucide-react';
import { TenantFormData } from '@/types/tenant';
import { useAdminEmailValidation } from '@/hooks/useAdminEmailValidation';

interface TenantAdminSectionProps {
  formData: TenantFormData;
  onFieldChange: (field: keyof TenantFormData, value: string | number) => void;
}

export const TenantAdminSection: React.FC<TenantAdminSectionProps> = ({
  formData,
  onFieldChange
}) => {
  const { isValidating, validationResult, validateAdminEmail, clearValidation } = useAdminEmailValidation();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailBlur = async () => {
    const email = formData.owner_email?.trim();
    
    if (!email) {
      clearValidation();
      return;
    }

    if (!validateEmail(email)) {
      return; // Let the basic validation handle this
    }

    await validateAdminEmail(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFieldChange('owner_email', e.target.value);
    // Clear validation when user starts typing
    if (validationResult) {
      clearValidation();
    }
  };

  const getEmailValidationIcon = () => {
    if (!formData.owner_email) return null;
    if (isValidating) return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
    if (!validateEmail(formData.owner_email)) return <XCircle className="w-4 h-4 text-red-500" />;
    if (validationResult?.exists === true) return <XCircle className="w-4 h-4 text-red-500" />;
    if (validationResult?.exists === false && validationResult?.valid === true) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return null;
  };

  const getEmailErrorMessage = () => {
    if (!formData.owner_email) return null;
    if (!validateEmail(formData.owner_email)) return 'Please enter a valid email address';
    if (validationResult?.error && !validationResult?.exists) return validationResult.error;
    if (validationResult?.exists === true) return 'This email is already used by another tenant. Please use a different email address.';
    return null;
  };

  const getEmailSuccessMessage = () => {
    if (formData.owner_email && 
        validateEmail(formData.owner_email) && 
        validationResult?.valid === true && 
        validationResult?.exists === false) {
      return 'Email is available';
    }
    return null;
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
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="admin@example.com"
                required
                className={`pr-10 ${
                  getEmailErrorMessage() ? 'border-red-500' : 
                  getEmailSuccessMessage() ? 'border-green-500' : ''
                }`}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {getEmailValidationIcon()}
              </div>
            </div>
            {getEmailErrorMessage() && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600">{getEmailErrorMessage()}</p>
              </div>
            )}
            {getEmailSuccessMessage() && (
              <p className="text-sm text-green-600">{getEmailSuccessMessage()}</p>
            )}
            {!getEmailErrorMessage() && !getEmailSuccessMessage() && !isValidating && (
              <p className="text-xs text-muted-foreground">Welcome email with login credentials will be sent here</p>
            )}
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
                <li>• Check if the email is already used by another tenant</li>
                <li>• Create a secure admin account (if email is available)</li>
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
