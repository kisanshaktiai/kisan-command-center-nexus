
import React from 'react';
import { RoleBasedAccess } from './RoleBasedAccess';
import { SessionGuard } from './SessionGuard';
import { SessionMonitor } from '@/components/session/SessionMonitor';
import { AdminAuthProvider } from '@/contexts/AdminAuthProvider';

interface AdminAuthWrapperProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'platform_admin' | 'super_admin';
  allowedRoles?: string[];
  showSessionMonitor?: boolean;
}

export const AdminAuthWrapper: React.FC<AdminAuthWrapperProps> = ({
  children,
  requiredRole = 'admin',
  allowedRoles = [],
  showSessionMonitor = true
}) => {
  return (
    <AdminAuthProvider>
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
    </AdminAuthProvider>
  );
};
