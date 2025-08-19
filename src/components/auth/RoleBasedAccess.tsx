
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldX, Loader2 } from 'lucide-react';
import { SYSTEM_ROLE_CODES, SystemRoleCode } from '@/types/roles';

interface RoleBasedAccessProps {
  children: React.ReactNode;
  requiredRole?: SystemRoleCode;
  allowedRoles?: SystemRoleCode[];
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

// Internal component that actually uses the auth context
const RoleBasedAccessWithAuth: React.FC<RoleBasedAccessProps> = ({
  children,
  requiredRole,
  allowedRoles = [],
  fallback,
  requireAuth = true
}) => {
  const { user, isLoading, isAdmin, isSuperAdmin, adminRole } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    return fallback || (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6">
          <Alert>
            <ShieldX className="h-4 w-4" />
            <AlertDescription>
              Authentication required to access this content.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check admin requirement
  if (requiredRole && !isAdmin) {
    return fallback || (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <ShieldX className="h-4 w-4" />
            <AlertDescription>
              Admin privileges required to access this content.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Check specific role requirements using system roles
  if (requiredRole || allowedRoles.length > 0) {
    const userRole = adminRole || '';
    
    // Define role hierarchy based on system_roles table levels
    const roleHierarchy = [
      SYSTEM_ROLE_CODES.SUPER_ADMIN,        // level 100
      SYSTEM_ROLE_CODES.PLATFORM_ADMIN,     // level 90
      SYSTEM_ROLE_CODES.TENANT_OWNER,       // level 80
      SYSTEM_ROLE_CODES.TENANT_ADMIN,       // level 70
      SYSTEM_ROLE_CODES.TENANT_MANAGER,     // level 60
      SYSTEM_ROLE_CODES.DEALER,             // level 40
      SYSTEM_ROLE_CODES.AGENT,              // level 35
      SYSTEM_ROLE_CODES.FARMER,             // level 20
      SYSTEM_ROLE_CODES.TENANT_USER         // level 10
    ];
    
    let hasAccess = false;

    if (requiredRole) {
      // Check if user has required role or higher in hierarchy
      const userRoleIndex = roleHierarchy.indexOf(userRole as SystemRoleCode);
      const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
      
      hasAccess = userRoleIndex !== -1 && requiredRoleIndex !== -1 && userRoleIndex <= requiredRoleIndex;
    }

    if (allowedRoles.length > 0) {
      // Check if user has any of the allowed roles
      hasAccess = hasAccess || allowedRoles.includes(userRole as SystemRoleCode);
    }

    if (!hasAccess) {
      return fallback || (
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <ShieldX className="h-4 w-4" />
              <AlertDescription>
                Insufficient privileges. Required role: {requiredRole || allowedRoles.join(', ')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }
  }

  return <>{children}</>;
};

// Main export with error boundary
export const RoleBasedAccess: React.FC<RoleBasedAccessProps> = (props) => {
  try {
    return <RoleBasedAccessWithAuth {...props} />;
  } catch (error) {
    console.error('RoleBasedAccess error boundary caught:', error);
    
    // If auth context is not available, show fallback or deny access for safety
    if (props.requireAuth) {
      return props.fallback || (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-600 mb-2">Authentication Error</div>
            <div className="text-sm text-muted-foreground">Please refresh the page</div>
          </div>
        </div>
      );
    }
    
    // For non-auth required routes, render children
    return <>{props.children}</>;
  }
};
