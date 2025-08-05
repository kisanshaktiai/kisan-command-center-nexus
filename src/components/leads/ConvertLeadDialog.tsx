
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { subscriptionPlanOptions } from '@/types/tenant';
import { CheckCircle, Copy, Eye, EyeOff, AlertTriangle, Info } from 'lucide-react';
import type { Lead } from '@/types/leads';

interface ConvertLeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
}

interface ConversionError {
  message: string;
  code?: string;
}

export const ConvertLeadDialog: React.FC<ConvertLeadDialogProps> = ({
  open,
  onClose,
  lead,
}) => {
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('Kisan_Basic');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [conversionResult, setConversionResult] = useState<any>(null);
  const [conversionError, setConversionError] = useState<ConversionError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const convertMutation = useConvertLeadToTenant();

  React.useEffect(() => {
    if (lead && open) {
      setTenantName(lead.organization_name || '');
      setTenantSlug(
        (lead.organization_name || lead.contact_name)
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
      );
      setAdminName(lead.contact_name);
      setAdminEmail(lead.email);
      setConversionResult(null);
      setConversionError(null);
    }
  }, [lead, open]);

  const getErrorMessage = (error: any): { message: string; code: string } => {
    console.log('Processing conversion error:', error);
    
    // Handle different error formats
    let errorMessage = 'An unexpected error occurred during conversion.';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error?.message) {
      errorMessage = error.message;
    }
    
    // Handle specific error codes from the edge function
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
    if (!lead || !tenantName.trim() || !tenantSlug.trim() || !adminName.trim() || !adminEmail.trim()) {
      setConversionError({
        message: 'Please fill in all required fields.',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    setConversionError(null);

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
        setConversionResult(result);
        setConversionError(null);
      },
      onError: (error: any) => {
        console.error('Conversion error in component:', error);
        const { message, code } = getErrorMessage(error);
        setConversionError({ message, code });
        setConversionResult(null);
      },
    });
  };

  const handleClose = () => {
    onClose();
    // Reset form after a delay to allow dialog animation
    setTimeout(() => {
      setTenantName('');
      setTenantSlug('');
      setSubscriptionPlan('Kisan_Basic');
      setAdminName('');
      setAdminEmail('');
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Conversion Failed
            </DialogTitle>
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
              <Button variant="outline" onClick={() => setConversionError(null)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Conversion Successful!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                The lead has been successfully converted to a tenant. An email with login credentials has been sent to the admin.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Tenant Name</Label>
                <p className="text-sm text-gray-600">{tenantName}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Tenant ID</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600 font-mono">{conversionResult.tenantId}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(conversionResult.tenantId)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Admin Email</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">{adminEmail}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(adminEmail)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {conversionResult.tempPassword && (
                <div>
                  <Label className="text-sm font-medium">Temporary Password</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={conversionResult.tempPassword}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(conversionResult.tempPassword)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This password was emailed to the admin and should be changed on first login.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Close
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead to Tenant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="organization-slug"
              pattern="^[a-z0-9-]+$"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
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

          <div>
            <Label htmlFor="adminName">Admin Name *</Label>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Admin full name"
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

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!tenantName.trim() || !tenantSlug.trim() || !adminEmail.trim() || !adminName.trim() || convertMutation.isPending}
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert to Tenant'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
