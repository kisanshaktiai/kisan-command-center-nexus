
import React, { useState } from 'react';
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

interface TenantManagementHeaderProps {
  onCreateTenant: (tenantData: any) => Promise<boolean>;
}

export const TenantManagementHeader: React.FC<TenantManagementHeaderProps> = ({
  onCreateTenant
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreate = async (tenantData: any): Promise<boolean> => {
    const success = await onCreateTenant(tenantData);
    if (success) {
      setIsCreateModalOpen(false);
    }
    return success;
  };

  const handleCancel = () => {
    setIsCreateModalOpen(false);
  };

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
          <Button>
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
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
