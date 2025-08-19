
import React from 'react';
import { RoleBasedAccess } from './RoleBasedAccess';
import { SessionGuard } from './SessionGuard';
import { SessionMonitor } from '@/components/session/SessionMonitor';
import { SystemRoleCode } from '@/types/roles';

interface AdminAuthWrapperProps {
  children: React.ReactNode;
  requiredRole?: SystemRoleCode;
  allowedRoles?: SystemRoleCode[];
  showSessionMonitor?: boolean;
}

export const AdminAuthWrapper: React.FC<AdminAuthWrapperProps> = ({
  children,
  requiredRole = 'super_admin',
  allowedRoles = [],
  showSessionMonitor = true
}) => {
  return (
    <SessionGuard showWarningAt={10}>
      <RoleBasedAccess 
        requiredRole={requiredRole}
        allowedRoles={allowedRoles}
        requireAuth={true}
      >
        {showSessionMonitor && <SessionMonitor />}
        {children}
      </RoleBasedAccess>
    </SessionGuard>
  );
};
