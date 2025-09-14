
import { UserRole, Permission } from '@/types/enums';

export interface RBACContext {
  userId: string;
  userRole: UserRole;
  tenantId?: string;
  tenantRole?: UserRole;
  permissions: Permission[];
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_CONFIG,
    Permission.TENANT_CREATE,
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.TENANT_DELETE,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.BILLING_ADMIN,
  ],
  [UserRole.PLATFORM_ADMIN]: [
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.BILLING_READ,
    Permission.BILLING_UPDATE,
  ],
  [UserRole.TENANT_ADMIN]: [
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.BILLING_READ,
  ],
  [UserRole.TENANT_USER]: [
    Permission.USER_READ,
  ],
  [UserRole.FARMER]: [
    Permission.USER_READ,
  ],
  [UserRole.DEALER]: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
  ],
};

export class RBACService {
  static hasPermission(context: RBACContext, permission: Permission): boolean {
    return context.permissions.includes(permission);
  }

  static hasAnyPermission(context: RBACContext, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(context, permission));
  }

  static hasAllPermissions(context: RBACContext, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(context, permission));
  }

  static hasRole(context: RBACContext, roles: UserRole[]): boolean {
    return roles.includes(context.userRole) || 
           (context.tenantRole && roles.includes(context.tenantRole));
  }

  static getPermissionsForRole(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  static buildContext(
    userId: string, 
    userRole: UserRole, 
    tenantId?: string, 
    tenantRole?: UserRole
  ): RBACContext {
    const basePermissions = this.getPermissionsForRole(userRole);
    const tenantPermissions = tenantRole ? this.getPermissionsForRole(tenantRole) : [];
    
    const allPermissions = [...new Set([...basePermissions, ...tenantPermissions])];
    
    return {
      userId,
      userRole,
      tenantId,
      tenantRole,
      permissions: allPermissions
    };
  }

  static canAccessTenant(context: RBACContext, targetTenantId: string): boolean {
    if (context.userRole === UserRole.SUPER_ADMIN) {
      return true;
    }
    
    if (context.userRole === UserRole.PLATFORM_ADMIN) {
      return true;
    }
    
    return context.tenantId === targetTenantId;
  }

  static isSystemAdmin(context: RBACContext): boolean {
    return this.hasRole(context, [UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN]);
  }

  static isTenantAdmin(context: RBACContext): boolean {
    return this.hasRole(context, [UserRole.TENANT_ADMIN]) || this.isSystemAdmin(context);
  }
}

// Export types and enums for use in other modules
export { UserRole, Permission };
// Export Role as an alias for UserRole to maintain compatibility
export { UserRole as Role };
