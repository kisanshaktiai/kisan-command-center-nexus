
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
import { useConvertLeadToTenant } from '@/hooks/useLeadManagement';
import { subscriptionPlanOptions } from '@/types/tenant';
import type { Lead } from '@/types/leads';

interface ConvertLeadDialogProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
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
    }
  }, [lead, open]);

  const handleSubmit = () => {
    if (!lead || !tenantName || !tenantSlug) return;

    convertMutation.mutate({
      leadId: lead.id,
      tenantName,
      tenantSlug,
      subscriptionPlan,
      adminName: adminName.trim() || undefined,
      adminEmail: adminEmail.trim() || undefined,
    }, {
      onSuccess: () => {
        onClose();
        // Reset form
        setTenantName('');
        setTenantSlug('');
        setSubscriptionPlan('Kisan_Basic');
        setAdminName('');
        setAdminEmail('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead to Tenant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="tenantName">Organization Name</Label>
            <Input
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Enter organization name"
            />
          </div>

          <div>
            <Label htmlFor="tenantSlug">Tenant Slug</Label>
            <Input
              id="tenantSlug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="organization-slug"
            />
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
            <Label htmlFor="adminName">Admin Name</Label>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Admin full name"
            />
          </div>

          <div>
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!tenantName || !tenantSlug || convertMutation.isPending}
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert to Tenant'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
