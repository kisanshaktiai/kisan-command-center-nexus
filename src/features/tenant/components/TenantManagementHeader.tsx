
import React, { useState, memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TenantForm } from '@/components/tenant/TenantForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateTenantDTO } from '@/data/types/tenant';

interface TenantManagementHeaderProps {
  onCreateTenant: (tenantData: CreateTenantDTO) => Promise<boolean>;
  onCreateSuccess?: (result: any) => void;
  isSubmitting?: boolean;
}

const TenantManagementHeader = memo<TenantManagementHeaderProps>(({
  onCreateTenant,
  onCreateSuccess,
  isSubmitting = false
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreate = useCallback(async (tenantData: any): Promise<boolean> => {
    const success = await onCreateTenant(tenantData);
    if (success) {
      setIsCreateModalOpen(false);
      onCreateSuccess?.({
        tenantName: tenantData.name,
        adminEmail: tenantData.owner_email,
        hasEmailSent: true
      });
    }
    return success;
  }, [onCreateTenant, onCreateSuccess]);

  const handleCancel = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
        <p className="text-muted-foreground">
          Manage and monitor all tenant organizations
        </p>
      </div>
      
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogTrigger asChild>
          <Button disabled={isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            Create Tenant
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
          </DialogHeader>
          <TenantForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
});

TenantManagementHeader.displayName = 'TenantManagementHeader';

export { TenantManagementHeader };
