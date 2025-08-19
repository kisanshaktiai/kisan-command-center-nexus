
import React from 'react';
import { useCurrentAuth } from '@/data/hooks/useAuthData';
import { RBACService, Permission, RBACContext } from '@/utils/rbac';
import { SystemRoleCode } from '@/types/roles';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface RBACGuardProps {
  children: React.ReactNode;
  permissions?: Permission[];
  roles?: SystemRoleCode[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

// Helper function to convert AuthState to RBACContext
const buildRBACContextFromAuthState = async (authState: any): Promise<RBACContext | null> => {
  if (!authState?.user?.id) return null;
  
  const userRole = authState.user.role || 'tenant_user' as SystemRoleCode;
  const userId = authState.user.id;
  const tenantId = authState.user.tenant_id;
  const tenantRole = authState.user.tenant_role;
  
  return await RBACService.buildContext(userId, userRole, tenantId, tenantRole);
};

export const RBACGuard: React.FC<RBACGuardProps> = ({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback
}) => {
  const { data: authState, isLoading } = useCurrentAuth();
  const [rbacContext, setRbacContext] = React.useState<RBACContext | null>(null);
  const [contextLoading, setContextLoading] = React.useState(true);

  React.useEffect(() => {
    const loadContext = async () => {
      if (!isLoading && authState) {
        try {
          const context = await buildRBACContextFromAuthState(authState);
          setRbacContext(context);
        } catch (error) {
          console.error('Error building RBAC context:', error);
          setRbacContext(null);
        }
      } else if (!isLoading && !authState) {
        setRbacContext(null);
      }
      setContextLoading(false);
    };

    loadContext();
  }, [authState, isLoading]);

  if (isLoading || contextLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!rbacContext) {
    return fallback || (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Authentication required to access this content.
        </AlertDescription>
      </Alert>
    );
  }

  // Check role-based access
  if (roles.length > 0 && !RBACService.hasRole(rbacContext, roles)) {
    return fallback || (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have the required role to access this content.
        </AlertDescription>
      </Alert>
    );
  }

  // Check permission-based access
  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? RBACService.hasAllPermissions(rbacContext, permissions)
      : RBACService.hasAnyPermission(rbacContext, permissions);

    if (!hasAccess) {
      return fallback || (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this content.
          </AlertDescription>
        </Alert>
      );
    }
  }

  return <>{children}</>;
};
