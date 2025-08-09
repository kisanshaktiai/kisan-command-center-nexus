
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
  const [isValidatingSlug, setIsValidatingSlug] = useState(false);
  const [slugValidationMessage, setSlugValidationMessage] = useState<string>('');

  const convertMutation = useConvertLeadToTenant();

  React.useEffect(() => {
    if (lead && open) {
      // Pre-populate form with lead data
      setTenantName(lead.organization_name || '');
      const baseSlug = (lead.organization_name || lead.contact_name)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);
      
      // Add timestamp to make slug unique
      const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
      setTenantSlug(uniqueSlug);
      
      setTenantType(lead.organization_type || 'agri_company');
      setAdminName(lead.contact_name || '');
      setAdminEmail(lead.email || '');
      setAdminPhone(lead.phone || '');
      setBusinessRegistration('');
      setConversionResult(null);
      setConversionError(null);
      setShowPassword(false);
      setSlugValidationMessage('');
    }
  }, [lead, open]);

  // Real-time slug validation
  React.useEffect(() => {
    if (tenantSlug && tenantSlug.length >= 3) {
      setIsValidatingSlug(true);
      const timeoutId = setTimeout(async () => {
        try {
          // Basic validation first
          if (!/^[a-z0-9-]+$/.test(tenantSlug)) {
            setSlugValidationMessage('Slug must contain only lowercase letters, numbers, and hyphens');
            setIsValidatingSlug(false);
            return;
          }
          
          if (tenantSlug.startsWith('-') || tenantSlug.endsWith('-')) {
            setSlugValidationMessage('Slug cannot start or end with a hyphen');
            setIsValidatingSlug(false);
            return;
          }
          
          if (tenantSlug.includes('--')) {
            setSlugValidationMessage('Slug cannot contain consecutive hyphens');
            setIsValidatingSlug(false);
            return;
          }

          setSlugValidationMessage('Slug format is valid');
        } catch (error) {
          setSlugValidationMessage('Error validating slug');
        }
        setIsValidatingSlug(false);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setSlugValidationMessage('');
    }
  }, [tenantSlug]);

  const validateForm = () => {
    if (!tenantName.trim()) return 'Organization name is required';
    if (!tenantSlug.trim()) return 'Tenant slug is required';
    if (tenantSlug.length < 3) return 'Tenant slug must be at least 3 characters';
    if (!adminName.trim()) return 'Admin name is required';
    if (!adminEmail.trim()) return 'Admin email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return 'Valid email is required';
    if (slugValidationMessage.includes('must contain only') || 
        slugValidationMessage.includes('cannot start') || 
        slugValidationMessage.includes('cannot contain')) {
      return slugValidationMessage;
    }
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
          errorMessage = `The slug "${tenantSlug}" is already taken. Please choose a different one or try adding numbers/letters.`;
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
      setSlugValidationMessage('');
    }, 300);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generateSuggestedSlug = () => {
    const base = tenantName || lead?.organization_name || lead?.contact_name || 'tenant';
    const cleanBase = base
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 40);
    const timestamp = Date.now().toString().slice(-6);
    const suggested = `${cleanBase}-${timestamp}`;
    setTenantSlug(suggested);
  };

  // Show error state
  if (conversionError) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md" aria-describedby="conversion-error-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conversion Failed
            </DialogTitle>
            <DialogDescription id="conversion-error-desc" className="text-muted-foreground">
              The lead conversion process encountered an error. Review the details below and try again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {conversionError.message}
              </AlertDescription>
            </Alert>

            {conversionError.code && (
              <div className="text-sm text-muted-foreground">
                Error Code: {conversionError.code}
              </div>
            )}

            {conversionError.code === 'SLUG_CONFLICT' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Try modifying the tenant slug to make it unique, or use the "Generate New Slug" button below.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              {conversionError.code === 'SLUG_CONFLICT' && (
                <Button variant="outline" onClick={generateSuggestedSlug} className="flex items-center gap-2 text-sm">
                  <RefreshCw className="h-4 w-4" />
                  Generate New Slug
                </Button>
              )}
              <Button variant="outline" onClick={handleRetry} className="flex items-center gap-2 text-sm">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={handleClose} className="text-sm">
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
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle className="h-5 w-5 text-success" />
              {conversionResult.isRecovery ? 'Conversion Recovered!' : 'Conversion Successful!'}
            </DialogTitle>
            <DialogDescription id="conversion-success-desc" className="text-muted-foreground text-sm">
              Lead has been successfully converted to a tenant account. Review the tenant details and admin credentials below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-success/10 border-success/20">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success text-sm">
                {conversionResult.isRecovery 
                  ? 'The lead conversion was completed successfully. The existing tenant has been properly linked to this lead.'
                  : 'The lead has been successfully converted to a tenant. A welcome email with login credentials has been sent to the admin.'
                }
              </AlertDescription>
            </Alert>

            {conversionResult.userTenantCreated && (
              <Alert className="bg-info/10 border-info/20">
                <UserCheck className="h-4 w-4 text-info" />
                <AlertDescription className="text-info text-sm">
                  User access has been successfully configured for the tenant.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Tenant Details</Label>
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium text-foreground">{tenantName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Slug:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground">{tenantSlug}</span>
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
                    <span className="text-sm text-muted-foreground">ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
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
                <Label className="text-sm font-medium text-foreground">Admin Account</Label>
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{adminEmail}</span>
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
                        <span className="text-sm text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">
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
              <Button onClick={handleClose} className="bg-success hover:bg-success/90 text-sm">
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
          <DialogTitle className="text-foreground">Convert Lead to Tenant</DialogTitle>
          <DialogDescription id="convert-lead-desc" className="text-muted-foreground text-sm">
            Complete the tenant information and admin account details below to convert this qualified lead into a tenant account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tenant Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground border-b pb-2 text-sm">Tenant Information</h3>
            
            <div>
              <Label htmlFor="tenantName" className="text-sm">Organization Name *</Label>
              <Input
                id="tenantName"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Enter organization name"
                required
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="tenantSlug" className="text-sm">Tenant Slug *</Label>
              <div className="flex gap-2">
                <Input
                  id="tenantSlug"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="organization-slug"
                  pattern="^[a-z0-9-]+$"
                  required
                  className="text-sm font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateSuggestedSlug}
                  className="text-xs whitespace-nowrap"
                >
                  Generate
                </Button>
              </div>
              <div className="mt-1">
                {isValidatingSlug && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Validating...
                  </p>
                )}
                {!isValidatingSlug && slugValidationMessage && (
                  <p className={`text-xs ${
                    slugValidationMessage.includes('valid') 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}>
                    {slugValidationMessage}
                  </p>
                )}
                {!isValidatingSlug && !slugValidationMessage && (
                  <p className="text-xs text-muted-foreground">
                    Only lowercase letters, numbers, and hyphens allowed
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="tenantType" className="text-sm">Organization Type</Label>
              <Select value={tenantType} onValueChange={setTenantType}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tenantTypeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-sm">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subscriptionPlan" className="text-sm">Subscription Plan</Label>
              <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionPlanOptions.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value} className="text-sm">
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Admin Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground border-b pb-2 text-sm">Admin Account Details</h3>
            
            <div>
              <Label htmlFor="adminName" className="text-sm">Admin Name *</Label>
              <Input
                id="adminName"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Full name"
                required
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="adminEmail" className="text-sm">Admin Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="adminPhone" className="text-sm">Phone Number</Label>
              <Input
                id="adminPhone"
                type="tel"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="+1234567890"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="businessRegistration" className="text-sm">Business Registration</Label>
              <Input
                id="businessRegistration"
                value={businessRegistration}
                onChange={(e) => setBusinessRegistration(e.target.value)}
                placeholder="GST/Tax ID (optional)"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={convertMutation.isPending || isValidatingSlug}
            className="bg-success hover:bg-success/90 text-sm"
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
