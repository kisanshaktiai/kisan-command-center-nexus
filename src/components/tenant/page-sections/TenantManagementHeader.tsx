
import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from 'lucide-react';
import { TenantForm } from '@/components/tenant/TenantForm';
import { TenantFormData } from '@/types/tenant';

interface TenantManagementHeaderProps {
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  formData: TenantFormData;
  setFormData: (data: TenantFormData) => void;
  onCreateTenant: () => Promise<boolean>;
  resetForm: () => void;
}

export const TenantManagementHeader: React.FC<TenantManagementHeaderProps> = ({
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  formData,
  setFormData,
  onCreateTenant,
  resetForm
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold">Tenant Management</h1>
        <p className="text-muted-foreground">Manage and configure tenant organizations</p>
      </div>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => {
            console.log('Opening create dialog');
            resetForm();
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Set up a new tenant organization with their subscription and admin account. 
              A welcome email with login credentials will be sent automatically.
            </DialogDescription>
          </DialogHeader>
          <TenantForm 
            formData={formData} 
            setFormData={setFormData} 
            onSubmit={onCreateTenant}
            isEditing={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
