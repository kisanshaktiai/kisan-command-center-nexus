
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLeadService } from '@/hooks/useLeadService';
import { useNotifications } from '@/hooks/useNotifications';
import type { Lead } from '@/types/leads';

interface ConvertLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess: () => void;
}

export const ConvertLeadDialog: React.FC<ConvertLeadDialogProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const [isConverting, setIsConverting] = useState(false);
  const [tenantName, setTenantName] = useState(lead?.organization_name || (lead ? `${lead.contact_name} Organization` : ''));
  const [tenantSlug, setTenantSlug] = useState('');
  const [adminName, setAdminName] = useState(lead?.contact_name || '');
  const [adminEmail, setAdminEmail] = useState(lead?.email || '');
  const [subscriptionPlan, setSubscriptionPlan] = useState('Kisan_Basic');

  const { convertToTenant } = useLeadService();
  const { showSuccess, showError } = useNotifications();

  // Generate slug from tenant name
  React.useEffect(() => {
    if (tenantName) {
      const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      setTenantSlug(slug);
    }
  }, [tenantName]);

  // Update form fields when lead changes
  React.useEffect(() => {
    if (lead) {
      setTenantName(lead.organization_name || `${lead.contact_name} Organization`);
      setAdminName(lead.contact_name);
      setAdminEmail(lead.email);
    }
  }, [lead]);

  const handleConvert = async () => {
    if (!lead) {
      showError('No lead selected for conversion');
      return;
    }

    if (!tenantName.trim() || !tenantSlug.trim() || !adminEmail.trim() || !adminName.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    setIsConverting(true);
    try {
      console.log('Converting lead with data:', {
        leadId: lead.id,
        tenantName,
        tenantSlug,
        subscriptionPlan,
        adminEmail,
        adminName
      });

      const result = await convertToTenant({
        leadId: lead.id,
        tenantName,
        tenantSlug,
        subscriptionPlan,
        adminEmail,
        adminName,
      });

      if (result) {
        showSuccess('Lead converted to tenant successfully! Welcome email sent.');
        onSuccess();
      } else {
        throw new Error('Conversion failed');
      }
    } catch (error) {
      console.error('Conversion error:', error);
      showError(error instanceof Error ? error.message : 'Failed to convert lead');
    } finally {
      setIsConverting(false);
    }
  };

  // Don't render if no lead is provided
  if (!lead) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convert Lead to Tenant</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tenantName">Organization Name *</Label>
            <Input
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Enter organization name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tenantSlug">Tenant Slug *</Label>
            <Input
              id="tenantSlug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="auto-generated-slug"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adminName">Admin Name *</Label>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Enter admin name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adminEmail">Admin Email *</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Enter admin email"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
            <select
              id="subscriptionPlan"
              value={subscriptionPlan}
              onChange={(e) => setSubscriptionPlan(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Kisan_Basic">Kisan Basic</option>
              <option value="Shakti_Growth">Shakti Growth</option>
              <option value="AI_Enterprise">AI Enterprise</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isConverting}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isConverting}>
            {isConverting ? 'Converting...' : 'Convert to Tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
