
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
  const { authState } = useAuth();

  if (!authState.isAuthenticated) {
    return <>{fallback}</>;
  }

  if (requiredRole && authState.adminRole !== requiredRole && !authState.isSuperAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
