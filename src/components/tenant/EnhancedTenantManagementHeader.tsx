
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { TenantCreateDialog } from './TenantCreateDialog';
import { CreateTenantDTO } from '@/data/types/tenant';

interface EnhancedTenantManagementHeaderProps {
  onCreateTenant: (tenantData: CreateTenantDTO) => Promise<boolean>;
  onRefresh?: () => void;
  isSubmitting?: boolean;
}

export const EnhancedTenantManagementHeader: React.FC<EnhancedTenantManagementHeaderProps> = ({
  onCreateTenant,
  onRefresh,
  isSubmitting = false
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleCreateSuccess = async (tenantData: CreateTenantDTO): Promise<boolean> => {
    const success = await onCreateTenant(tenantData);
    if (success) {
      setIsCreateDialogOpen(false);
      onRefresh?.();
    }
    return success;
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor all tenant organizations with world-class user experience
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
          
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={isSubmitting}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Tenant
          </Button>
        </div>
      </div>

      <TenantCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateTenant={handleCreateSuccess}
        isSubmitting={isSubmitting}
      />
    </>
  );
};
