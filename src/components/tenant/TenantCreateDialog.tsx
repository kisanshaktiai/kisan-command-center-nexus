
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TenantForm } from '@/components/tenant/TenantForm';
import { CreateTenantDTO } from '@/data/types/tenant';

interface TenantCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTenant: (data: CreateTenantDTO) => Promise<boolean>;
  isSubmitting?: boolean;
}

export const TenantCreateDialog: React.FC<TenantCreateDialogProps> = ({
  isOpen,
  onClose,
  onCreateTenant,
  isSubmitting = false
}) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (tenantData: CreateTenantDTO): Promise<boolean> => {
    try {
      setIsCreating(true);
      const success = await onCreateTenant(tenantData);
      if (success) {
        onClose();
      }
      return success;
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (!isCreating && !isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tenant Organization</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <TenantForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={handleCancel}
            isSubmitting={isCreating || isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
