
import React from 'react';
import { TenantCreationSuccess } from '@/components/tenant/TenantCreationSuccess';

interface TenantSuccessNotificationProps {
  creationSuccess: {
    tenantName: string;
    adminEmail: string;
    hasEmailSent: boolean;
  } | null;
  onClose: () => void;
}

export const TenantSuccessNotification: React.FC<TenantSuccessNotificationProps> = ({
  creationSuccess,
  onClose
}) => {
  if (!creationSuccess) return null;

  return (
    <TenantCreationSuccess
      tenantName={creationSuccess.tenantName}
      adminEmail={creationSuccess.adminEmail}
      hasEmailSent={creationSuccess.hasEmailSent}
      onClose={onClose}
    />
  );
};
