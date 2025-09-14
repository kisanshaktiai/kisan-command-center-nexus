
import React, { useState, memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { TenantForm } from '@/components/tenant/TenantForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateTenantDTO } from '@/types/tenant';

interface EnhancedTenantManagementHeaderProps {
  onCreateTenant: (tenantData: CreateTenantDTO) => Promise<boolean>;
  onRefresh: () => void;
  isSubmitting?: boolean;
}

const EnhancedTenantManagementHeader = memo<EnhancedTenantManagementHeaderProps>(({
  onCreateTenant,
  onRefresh,
  isSubmitting = false
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreate = useCallback(async (tenantData: CreateTenantDTO): Promise<boolean> => {
    console.log('EnhancedTenantManagementHeader: Creating tenant:', tenantData);
    
    const success = await onCreateTenant(tenantData);
    
    if (success) {
      console.log('EnhancedTenantManagementHeader: Tenant created successfully, closing modal');
      setIsCreateModalOpen(false);
    } else {
      console.error('EnhancedTenantManagementHeader: Failed to create tenant');
    }
    
    return success;
  }, [onCreateTenant]);

  const handleCancel = useCallback(() => {
    console.log('EnhancedTenantManagementHeader: Cancelling tenant creation');
    setIsCreateModalOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('EnhancedTenantManagementHeader: Refreshing tenant data');
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
        <p className="text-muted-foreground">
          Manage and monitor all tenant organizations
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSubmitting ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button disabled={isSubmitting}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tenant Organization</DialogTitle>
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
    </div>
  );
});

EnhancedTenantManagementHeader.displayName = 'EnhancedTenantManagementHeader';

export { EnhancedTenantManagementHeader };
