
import React from 'react';
import { Navigate } from 'react-router-dom';
import { AdminAuthWrapper } from './AdminAuthWrapper';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredRole?: 'admin' | 'platform_admin' | 'super_admin';
  allowedRoles?: string[];
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
        requiredRole={requiredRole}
        allowedRoles={allowedRoles}
      >
        {children}
      </AdminAuthWrapper>
    );
  }

  return <>{children}</>;
};
