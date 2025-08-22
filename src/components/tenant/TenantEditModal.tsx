
import React, { useState, useEffect } from 'react';
import { UpdateTenantDTO } from '@/types/tenant';
import { TenantStatus, SubscriptionPlan, TenantStatusValue, SubscriptionPlanValue } from '@/types/enums';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TenantEditModalProps {
  tenant: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: UpdateTenantDTO) => Promise<boolean>;
}

interface FormData {
  name: string;
  status: TenantStatusValue;
  subscription_plan: SubscriptionPlanValue;
}

const TenantEditModal: React.FC<TenantEditModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    status: TenantStatus.TRIAL as TenantStatusValue,
    subscription_plan: SubscriptionPlan.KISAN_BASIC as SubscriptionPlanValue,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        status: tenant.status || TenantStatus.TRIAL as TenantStatusValue,
        subscription_plan: tenant.subscription_plan || SubscriptionPlan.KISAN_BASIC as SubscriptionPlanValue,
      });
    }
  }, [tenant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, status: value as TenantStatusValue }));
  };

  const handlePlanChange = (value: string) => {
    setFormData(prev => ({ ...prev, subscription_plan: value as SubscriptionPlanValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateTenantDTO = {
        id: tenant.id,
        name: formData.name,
        status: formData.status,
        subscription_plan: formData.subscription_plan,
      };
      
      const success = await onSave(tenant.id, updateData);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
          <DialogDescription>
            Make changes to the tenant information here.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tenant Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="Enter tenant name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TenantStatus.TRIAL}>Trial</SelectItem>
                <SelectItem value={TenantStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={TenantStatus.SUSPENDED}>Suspended</SelectItem>
                <SelectItem value={TenantStatus.ARCHIVED}>Archived</SelectItem>
                <SelectItem value={TenantStatus.PENDING_APPROVAL}>Pending Approval</SelectItem>
                <SelectItem value={TenantStatus.CANCELLED}>Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscription_plan">Subscription Plan</Label>
            <Select value={formData.subscription_plan} onValueChange={handlePlanChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SubscriptionPlan.KISAN_BASIC}>Kisan Basic</SelectItem>
                <SelectItem value={SubscriptionPlan.SHAKTI_GROWTH}>Shakti Growth</SelectItem>
                <SelectItem value={SubscriptionPlan.AI_ENTERPRISE}>AI Enterprise</SelectItem>
                <SelectItem value={SubscriptionPlan.CUSTOM_ENTERPRISE}>Custom Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TenantEditModal;
