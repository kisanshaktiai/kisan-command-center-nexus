
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TenantPageHeaderProps {
  creationSuccess?: {
    tenantName: string;
    adminEmail: string;
    hasEmailSent: boolean;
  } | null;
  onClearSuccess: () => void;
}

export const TenantPageHeader: React.FC<TenantPageHeaderProps> = ({
  creationSuccess,
  onClearSuccess
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage tenants, subscriptions, and configurations
          </p>
        </div>
      </div>

      {creationSuccess && (
        <Alert>
          <AlertDescription>
            Tenant "{creationSuccess.tenantName}" created successfully!
            {creationSuccess.hasEmailSent && (
              <span className="ml-2">
                Invitation email sent to {creationSuccess.adminEmail}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
