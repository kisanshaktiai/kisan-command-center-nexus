
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConvertLeadToTenant } from '@/hooks/useLeadManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { Lead } from '@/types/leads';

interface ConvertLeadDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SUBSCRIPTION_PLANS = [
  { value: 'Kisan_Basic', label: 'Kisan Basic' },
  { value: 'Shakti_Growth', label: 'Shakti Growth' },
  { value: 'AI_Enterprise', label: 'AI Enterprise' },
  { value: 'Custom_Enterprise', label: 'Custom Enterprise' },
];

export const ConvertLeadDialog: React.FC<ConvertLeadDialogProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('Kisan_Basic');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  const convertMutation = useConvertLeadToTenant();

  // Initialize form with lead data when dialog opens
  React.useEffect(() => {
    if (lead && isOpen) {
      setTenantName(lead.organization_name || '');
      setTenantSlug(generateSlug(lead.organization_name || ''));
      setAdminEmail(lead.email);
      setAdminName(lead.contact_name);
    }
  }, [lead, isOpen]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  const handleTenantNameChange = (value: string) => {
    setTenantName(value);
    setTenantSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lead) return;

    // Validate that lead is qualified
    if (lead.status !== 'qualified') {
      return;
    }

    try {
      await convertMutation.mutateAsync({
        leadId: lead.id,
        tenantName,
        tenantSlug,
        subscriptionPlan,
        adminEmail,
        adminName,
      });

      onSuccess?.();
      onClose();
      resetForm();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const resetForm = () => {
    setTenantName('');
    setTenantSlug('');
    setSubscriptionPlan('Kisan_Basic');
    setAdminEmail('');
    setAdminName('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  // Check if lead can be converted
  const canConvert = lead?.status === 'qualified';
  const isConverted = lead?.status === 'converted';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convert Lead to Tenant</DialogTitle>
          <DialogDescription>
            Convert this qualified lead into a tenant account with full access.
          </DialogDescription>
        </DialogHeader>

        {/* Status Alerts */}
        {!canConvert && lead && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {isConverted 
                ? 'This lead has already been converted to a tenant.'
                : `Only qualified leads can be converted. Current status: ${lead.status}`
              }
            </AlertDescription>
          </Alert>
        )}

        {canConvert && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              A tenant account will be created with default features based on the selected plan. 
              Welcome email with login credentials will be sent automatically.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Tenant Name</Label>
              <Input
                id="tenantName"
                value={tenantName}
                onChange={(e) => handleTenantNameChange(e.target.value)}
                placeholder="Enter tenant name"
                disabled={!canConvert || convertMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Tenant Slug</Label>
              <Input
                id="tenantSlug"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="tenant-slug"
                disabled={!canConvert || convertMutation.isPending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
            <Select 
              value={subscriptionPlan} 
              onValueChange={setSubscriptionPlan}
              disabled={!canConvert || convertMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <SelectItem key={plan.value} value={plan.value}>
                    {plan.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin Name</Label>
              <Input
                id="adminName"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Admin full name"
                disabled={!canConvert || convertMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={!canConvert || convertMutation.isPending}
                required
              />
            </div>
          </div>

          {convertMutation.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {convertMutation.error instanceof Error 
                  ? convertMutation.error.message 
                  : 'Failed to convert lead. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={convertMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!canConvert || convertMutation.isPending}
              className="min-w-[120px]"
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
