
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RBACGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export const RBACGuard: React.FC<RBACGuardProps> = ({
  children,
  requiredRole,
  fallback = <div>Access denied</div>
}) => {
  const { isAuthenticated, isAdmin, isSuperAdmin, adminRole } = useAuth();

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  if (requiredRole && adminRole !== requiredRole && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
