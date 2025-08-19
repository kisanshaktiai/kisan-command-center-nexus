
import React from 'react';
import { AdminAuthWrapper } from './AdminAuthWrapper';
import { SystemRoleCode } from '@/types/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredRole?: SystemRoleCode;
  allowedRoles?: SystemRoleCode[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requiredRole,
  allowedRoles = []
}) => {
  if (requireAdmin || requiredRole || allowedRoles.length > 0) {
    return (
      <AdminAuthWrapper 
        requiredRole={requiredRole || (requireAdmin ? 'super_admin' : undefined)}
        allowedRoles={allowedRoles}
      >
        {children}
      </AdminAuthWrapper>
    );
  }

  return <>{children}</>;
};
