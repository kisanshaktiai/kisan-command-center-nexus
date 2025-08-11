
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConvertLeadToTenant } from '@/hooks/useConvertLeadToTenant';
import { Lead } from '@/types/leads';

interface ConvertLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

export const ConvertLeadDialog: React.FC<ConvertLeadDialogProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess
}) => {
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('Kisan_Basic');
  
  const convertMutation = useConvertLeadToTenant();

  // Initialize form when lead changes
  React.useEffect(() => {
    if (lead) {
      const defaultName = lead.organization_name || `${lead.contact_name} Organization`;
      setTenantName(defaultName);
      setTenantSlug(defaultName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lead) return;

    console.log('ConvertLeadDialog: Starting conversion for lead:', lead.id);
    
    try {
      const result = await convertMutation.mutateAsync({
        leadId: lead.id,
        tenantName,
        tenantSlug,
        subscriptionPlan,
        adminEmail: lead.email,
        adminName: lead.contact_name,
      });

      console.log('ConvertLeadDialog: Conversion completed:', result);
      
      // Close dialog and trigger success callback
      onClose();
      onSuccess?.();
      
      // Reset form
      setTenantName('');
      setTenantSlug('');
      setSubscriptionPlan('Kisan_Basic');
      
    } catch (error) {
      console.error('ConvertLeadDialog: Conversion failed:', error);
      // Error is already handled by the mutation's onError
    }
  };

  const handleClose = () => {
    onClose();
    setTenantName('');
    setTenantSlug('');
    setSubscriptionPlan('Kisan_Basic');
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convert Lead to Tenant</DialogTitle>
          <DialogDescription>
            Convert {lead.contact_name} from {lead.organization_name || 'their organization'} into a tenant account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantName">Tenant Name</Label>
            <Input
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Enter tenant name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantSlug">Tenant Slug</Label>
            <Input
              id="tenantSlug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="Enter tenant slug"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
            <Select value={subscriptionPlan} onValueChange={setSubscriptionPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kisan_Basic">Kisan – Starter</SelectItem>
                <SelectItem value="Shakti_Growth">Shakti – Growth</SelectItem>
                <SelectItem value="AI_Enterprise">AI – Enterprise</SelectItem>
                <SelectItem value="custom">Custom Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <p><strong>Contact:</strong> {lead.contact_name}</p>
            <p><strong>Email:</strong> {lead.email}</p>
            {lead.organization_name && <p><strong>Organization:</strong> {lead.organization_name}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={convertMutation.isPending || !tenantName.trim() || !tenantSlug.trim()}
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert to Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
