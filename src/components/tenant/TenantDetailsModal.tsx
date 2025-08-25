
import React from 'react';
import { Tenant } from '@/types/tenant';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/providers/ErrorBoundary';
import { UserManagementSection } from './UserManagementSection';
import { TenantBasicInfo } from './TenantBasicInfo';
import { TenantOwnerInfo } from './TenantOwnerInfo';
import { TenantSubscriptionInfo } from './TenantSubscriptionInfo';
import { ResourceMetrics } from './ResourceMetrics';

interface TenantDetailsModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tenant: Tenant) => void;
}

const TenantDetailsModalContent: React.FC<TenantDetailsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit
}) => {
  if (!tenant) return null;

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      trial: 'secondary', 
      suspended: 'destructive',
      cancelled: 'outline',
      archived: 'outline'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">{tenant.name}</DialogTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge(tenant.status)}
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(tenant)}>
                  Edit Tenant
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TenantBasicInfo tenant={tenant} />
          
          <ErrorBoundary
            context={{
              component: 'UserManagementCard',
              level: 'high',
              metadata: { tenantId: tenant.id }
            }}
          >
            <div className="bg-white border rounded-lg">
              <div className="p-6">
                <h3 className="text-base font-semibold mb-4">Admin User Management</h3>
                <UserManagementSection tenant={tenant} />
              </div>
            </div>
          </ErrorBoundary>

          <TenantOwnerInfo tenant={tenant} />
          <TenantSubscriptionInfo tenant={tenant} />
          <ResourceMetrics tenant={tenant} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = (props) => {
  return (
    <ErrorBoundary
      context={{
        component: 'TenantDetailsModal',
        level: 'high',
        metadata: { tenantId: props.tenant?.id }
      }}
    >
      <TenantDetailsModalContent {...props} />
    </ErrorBoundary>
  );
};
