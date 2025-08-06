import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useConvertLeadToTenant } from '@/hooks/useLeadManagement';
import { subscriptionPlanOptions, tenantTypeOptions } from '@/types/tenant';
import { CheckCircle, Copy, Eye, EyeOff, AlertTriangle, Info, RefreshCw, UserCheck, Loader2 } from 'lucide-react';
import type { Lead } from '@/types/leads';

interface ConvertLeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
  onSuccess?: () => void;
}

interface ConversionError {
  message: string;
  code?: string;
}

interface ConversionResult {
  success: boolean;
  message?: string;
  tenantId: string;
  userId?: string;
  tenantSlug: string;
  tempPassword?: string;
  isRecovery?: boolean;
  userTenantCreated?: boolean;
}

export const ConvertLeadDialog: React.FC<ConvertLeadDialogProps> = ({
  open,
  onClose,
  lead,
  onSuccess,
}) => {
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantType, setTenantType] = useState<string>('agri_company');
  const [subscriptionPlan, setSubscriptionPlan] = useState('Kisan_Basic');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [businessRegistration, setBusinessRegistration] = useState('');
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [conversionError, setConversionError] = useState<ConversionError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const convertMutation = useConvertLeadToTenant();

  React.useEffect(() => {
    if (lead && open) {
      // Pre-populate form with lead data
      setTenantName(lead.organization_name || '');
      setTenantSlug(
        (lead.organization_name || lead.contact_name)
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 50)
      );
      setTenantType(lead.organization_type || 'agri_company');
      setAdminName(lead.contact_name || '');
      setAdminEmail(lead.email || '');
      setAdminPhone(lead.phone || '');
      setBusinessRegistration('');
      setConversionResult(null);
      setConversionError(null);
      setShowPassword(false);
    }
  }, [lead, open]);

  const validateForm = () => {
    if (!tenantName.trim()) return 'Organization name is required';
    if (!tenantSlug.trim()) return 'Tenant slug is required';
    if (!adminName.trim()) return 'Admin name is required';
    if (!adminEmail.trim()) return 'Admin email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return 'Valid email is required';
    return null;
  };

  const getErrorMessage = (error: any): { message: string; code: string } => {
    console.log('Processing conversion error:', error);
    
    let errorMessage = 'An unexpected error occurred during conversion.';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error?.message) {
      errorMessage = error.message;
    }
    
    if (error?.code || (error as any)?.code) {
      errorCode = error.code || (error as any).code;
      switch (errorCode) {
        case 'SLUG_CONFLICT':
          errorMessage = `The slug "${tenantSlug}" is already taken. Please choose a different one.`;
          break;
        case 'LEAD_ALREADY_CONVERTED':
          errorMessage = 'This lead has already been converted to a tenant.';
          break;
        case 'LEAD_NOT_FOUND':
          errorMessage = 'Lead not found or not in a convertible status.';
          break;
        case 'VALIDATION_ERROR':
          errorMessage = error.message || 'Please check all required fields.';
          break;
        case 'DATABASE_ERROR':
          errorMessage = 'Database operation failed. Please try again.';
          break;
        case 'USER_SETUP_ERROR':
          errorMessage = 'Tenant created but user access setup failed. Contact support for assistance.';
          break;
        case 'INTERNAL_ERROR':
          errorMessage = 'Internal server error. Please try again later.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
    }

    return { message: errorMessage, code: errorCode };
  };

  const handleSubmit = () => {
    const validationError = validateForm();
    if (validationError) {
      setConversionError({
        message: validationError,
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    if (!lead) {
      setConversionError({
        message: 'Lead information is missing.',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    setConversionError(null);

    console.log('Starting conversion with data:', {
      leadId: lead.id,
      tenantName: tenantName.trim(),
      tenantSlug: tenantSlug.trim(),
      tenantType,
      subscriptionPlan,
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim(),
      adminPhone: adminPhone.trim(),
      businessRegistration: businessRegistration.trim(),
    });

    convertMutation.mutate({
      leadId: lead.id,
      tenantName: tenantName.trim(),
      tenantSlug: tenantSlug.trim(),
      subscriptionPlan,
      adminName: adminName.trim(),
      adminEmail: adminEmail.trim(),
    }, {
      onSuccess: (result) => {
        console.log('Conversion successful:', result);
        setConversionResult(result as ConversionResult);
        setConversionError(null);
        onSuccess?.();
      },
      onError: (error: any) => {
        console.error('Conversion error in component:', error);
        const { message, code } = getErrorMessage(error);
        setConversionError({ message, code });
        setConversionResult(null);
      },
    });
  };

  const handleRetry = () => {
    setConversionError(null);
    setConversionResult(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setTenantName('');
      setTenantSlug('');
      setTenantType('agri_company');
      setSubscriptionPlan('Kisan_Basic');
      setAdminName('');
      setAdminEmail('');
      setAdminPhone('');
      setBusinessRegistration('');
      setConversionResult(null);
      setConversionError(null);
      setShowPassword(false);
    }, 300);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Show error state
  if (conversionError) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md" aria-describedby="conversion-error-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Conversion Failed
            </DialogTitle>
            <DialogDescription id="conversion-error-desc">
              The lead conversion process encountered an error. Review the details below and try again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {conversionError.message}
              </AlertDescription>
            </Alert>

            {conversionError.code && (
              <div className="text-sm text-gray-500">
                Error Code: {conversionError.code}
              </div>
            )}

            {conversionError.code === 'SLUG_CONFLICT' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Try modifying the tenant slug to make it unique, such as adding numbers or your company identifier.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleRetry} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show success result if conversion completed
  if (conversionResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg" aria-describedby="conversion-success-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {conversionResult.isRecovery ? 'Conversion Recovered!' : 'Conversion Successful!'}
            </DialogTitle>
            <DialogDescription id="conversion-success-desc">
              Lead has been successfully converted to a tenant account. Review the tenant details and admin credentials below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {conversionResult.isRecovery 
                  ? 'The lead conversion was completed successfully. The existing tenant has been properly linked to this lead.'
                  : 'The lead has been successfully converted to a tenant. A welcome email with login credentials has been sent to the admin.'
                }
              </AlertDescription>
            </Alert>

            {conversionResult.userTenantCreated && (
              <Alert className="bg-blue-50 border-blue-200">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  User access has been successfully configured for the tenant.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tenant Details</Label>
                <div className="bg-gray-50 p-3 rounded-md space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{tenantName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Slug:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{tenantSlug}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(tenantSlug)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">
                        {conversionResult.tenantId.slice(0, 8)}...
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(conversionResult.tenantId)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Admin Account</Label>
                <div className="bg-gray-50 p-3 rounded-md space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Email:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{adminEmail}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(adminEmail)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {conversionResult.tempPassword && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {conversionResult.isRecovery ? 'Password:' : 'Temp Password:'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={conversionResult.tempPassword}
                            readOnly
                            className="h-8 w-32 text-xs font-mono"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowPassword(!showPassword)}
                            className="h-6 w-6 p-0"
                          >
                            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(conversionResult.tempPassword!)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {conversionResult.isRecovery 
                          ? 'This is the password from when the tenant was first created.'
                          : 'This password was emailed to the admin and must be changed on first login.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">
                Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show conversion form
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="convert-lead-desc">
        <DialogHeader>
          <DialogTitle>Convert Lead to Tenant</DialogTitle>
          <DialogDescription id="convert-lead-desc">
            Complete the tenant information and admin account details below to convert this qualified lead into a tenant account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tenant Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Tenant Information</h3>
            
            <div>
              <Label htmlFor="tenantName">Organization Name *</Label>
              <Input
                id="tenantName"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Enter organization name"
                required
              />
            </div>

            <div>
              <Label htmlFor="tenantSlug">Tenant Slug *</Label>
              <Input
                id="tenantSlug"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="organization-slug"
                pattern="^[a-z0-9-]+$"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>

            <div>
              <Label htmlFor="tenantType">Organization Type</Label>
              <Select value={tenantType} onValueChange={setTenantType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tenantTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
              <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlanOptions.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Admin Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Admin Account Details</h3>
            
            <div>
              <Label htmlFor="adminName">Admin Name *</Label>
              <Input
                id="adminName"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="adminEmail">Admin Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="adminPhone">Phone Number</Label>
              <Input
                id="adminPhone"
                type="tel"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>

            <div>
              <Label htmlFor="businessRegistration">Business Registration</Label>
              <Input
                id="businessRegistration"
                value={businessRegistration}
                onChange={(e) => setBusinessRegistration(e.target.value)}
                placeholder="GST/Tax ID (optional)"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={convertMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {convertMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              'Convert to Tenant'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
