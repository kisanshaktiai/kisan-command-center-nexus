
import { SYSTEM_ROLE_CODES, SystemRoleCode } from '@/types/roles';
import { Permission } from '@/types/enums';

export interface RBACContext {
  userId: string;
  userRole: SystemRoleCode;
  tenantId?: string;
  tenantRole?: SystemRoleCode;
  permissions: Permission[];
}

const ROLE_PERMISSIONS: Record<SystemRoleCode, Permission[]> = {
  [SYSTEM_ROLE_CODES.SUPER_ADMIN]: [
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
  [SYSTEM_ROLE_CODES.PLATFORM_ADMIN]: [
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.BILLING_READ,
    Permission.BILLING_UPDATE,
  ],
  [SYSTEM_ROLE_CODES.TENANT_OWNER]: [
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.BILLING_READ,
  ],
  [SYSTEM_ROLE_CODES.TENANT_ADMIN]: [
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.BILLING_READ,
  ],
  [SYSTEM_ROLE_CODES.TENANT_MANAGER]: [
    Permission.TENANT_READ,
    Permission.USER_READ,
    Permission.USER_UPDATE,
  ],
  [SYSTEM_ROLE_CODES.TENANT_USER]: [
    Permission.USER_READ,
  ],
  [SYSTEM_ROLE_CODES.FARMER]: [
    Permission.USER_READ,
  ],
  [SYSTEM_ROLE_CODES.DEALER]: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
  ],
  [SYSTEM_ROLE_CODES.AGENT]: [
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

  static hasRole(context: RBACContext, roles: SystemRoleCode[]): boolean {
    return roles.includes(context.userRole) || 
           (context.tenantRole && roles.includes(context.tenantRole));
  }

  static getPermissionsForRole(role: SystemRoleCode): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  static buildContext(
    userId: string, 
    userRole: SystemRoleCode, 
    tenantId?: string, 
    tenantRole?: SystemRoleCode
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
    if (context.userRole === SYSTEM_ROLE_CODES.SUPER_ADMIN) {
      return true;
    }
    
    if (context.userRole === SYSTEM_ROLE_CODES.PLATFORM_ADMIN) {
      return true;
    }
    
    return context.tenantId === targetTenantId;
  }

  static isSystemAdmin(context: RBACContext): boolean {
    return this.hasRole(context, [SYSTEM_ROLE_CODES.SUPER_ADMIN, SYSTEM_ROLE_CODES.PLATFORM_ADMIN]);
  }

  static isTenantAdmin(context: RBACContext): boolean {
    return this.hasRole(context, [SYSTEM_ROLE_CODES.TENANT_ADMIN, SYSTEM_ROLE_CODES.TENANT_OWNER]) || this.isSystemAdmin(context);
  }
}

// Export types and enums for use in other modules
export { Permission };
// Export SystemRoleCode as Role for compatibility
export type Role = SystemRoleCode;
export { SystemRoleCode as UserRole };
