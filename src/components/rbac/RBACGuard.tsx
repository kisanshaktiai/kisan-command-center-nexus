
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedTenant } from '@/contexts/EnhancedTenantContext';
import { EnhancedRBACService, UserRole, Permission, type RBACContext } from '@/services/EnhancedRBACService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface RBACGuardProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permissions?: Permission[];
  requireAll?: boolean;
  tenantRequired?: boolean;
  fallback?: React.ReactNode;
  showError?: boolean;
}

export const RBACGuard: React.FC<RBACGuardProps> = ({
  children,
  roles = [],
  permissions = [],
  requireAll = false,
  tenantRequired = false,
  fallback,
  showError = true
}) => {
  const { user, adminRole, isAdmin } = useAuth();
  const { currentTenant } = useEnhancedTenant();

  // Build RBAC context
  const buildRBACContext = (): RBACContext | null => {
    if (!user) return null;

    const userRole = adminRole as UserRole || UserRole.TENANT_USER;
    const tenantRole = isAdmin ? UserRole.TENANT_ADMIN : UserRole.TENANT_USER;
    
    return EnhancedRBACService.buildContext(
      user.id,
      userRole,
      currentTenant?.id,
      tenantRole
    );
  };

  const context = buildRBACContext();

  // Check if tenant is required
  if (tenantRequired && !currentTenant) {
    if (fallback) return <>{fallback}</>;
    
    if (showError) {
      return (
        <div className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Tenant Required</h3>
                  <p className="text-muted-foreground mt-2">
                    Please select a tenant to access this feature.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return null;
  }

  // Check authentication
  if (!context) {
    if (fallback) return <>{fallback}</>;
    
    if (showError) {
      return (
        <div className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Authentication Required</h3>
                  <p className="text-muted-foreground mt-2">
                    Please sign in to access this content.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return null;
  }

  // Check role-based access
  if (roles.length > 0) {
    const hasRequiredRole = EnhancedRBACService.hasRole(context, roles);
    if (!hasRequiredRole) {
      if (fallback) return <>{fallback}</>;
      
      if (showError) {
        return (
          <div className="flex items-center justify-center p-8">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Insufficient Role</h3>
                    <p className="text-muted-foreground mt-2">
                      You don't have the required role to access this content.
                    </p>
                  </div>
                  <Alert variant="destructive">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Required roles: {roles.join(', ')}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
      
      return null;
    }
  }

  // Check permission-based access
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? EnhancedRBACService.hasAllPermissions(context, permissions)
      : EnhancedRBACService.hasAnyPermission(context, permissions);

    if (!hasRequiredPermissions) {
      if (fallback) return <>{fallback}</>;
      
      if (showError) {
        return (
          <div className="flex items-center justify-center p-8">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Insufficient Permissions</h3>
                    <p className="text-muted-foreground mt-2">
                      You don't have permission to access this content.
                    </p>
                  </div>
                  <Alert variant="destructive">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Required permissions: {permissions.join(', ')}
                      <br />
                      Match {requireAll ? 'all' : 'any'} of the above permissions.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }
      
      return null;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

// HOC for component-level protection
export function withRBAC<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<RBACGuardProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <RBACGuard {...guardProps}>
        <Component {...props} />
      </RBACGuard>
    );
  };
}

// Hook for conditional rendering
export const useRBAC = () => {
  const { user, adminRole, isAdmin } = useAuth();
  const { currentTenant } = useEnhancedTenant();

  const buildRBACContext = (): RBACContext | null => {
    if (!user) return null;

    const userRole = adminRole as UserRole || UserRole.TENANT_USER;
    const tenantRole = isAdmin ? UserRole.TENANT_ADMIN : UserRole.TENANT_USER;
    
    return EnhancedRBACService.buildContext(
      user.id,
      userRole,
      currentTenant?.id,
      tenantRole
    );
  };

  const context = buildRBACContext();

  return {
    context,
    hasPermission: (permission: Permission) => 
      context ? EnhancedRBACService.hasPermission(context, permission) : false,
    hasRole: (roles: UserRole[]) => 
      context ? EnhancedRBACService.hasRole(context, roles) : false,
    canAccessResource: (resource: string, action: 'create' | 'read' | 'update' | 'delete') =>
      context ? EnhancedRBACService.canAccessResource(context, resource, action) : false,
    isSystemAdmin: () =>
      context ? EnhancedRBACService.isSystemAdmin(context) : false,
    isTenantAdmin: () =>
      context ? EnhancedRBACService.isTenantAdmin(context) : false
  };
};
