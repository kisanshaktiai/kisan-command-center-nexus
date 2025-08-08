
import { AuthState } from '@/types/auth';

export type Role = 'super_admin' | 'platform_admin' | 'admin' | 'user';
export type Permission = 
  | 'tenant.create' 
  | 'tenant.read' 
  | 'tenant.update' 
  | 'tenant.delete'
  | 'user.create'
  | 'user.read'
  | 'user.update'
  | 'user.delete'
  | 'admin.create'
  | 'admin.read'
  | 'admin.update'
  | 'admin.delete';

const rolePermissions: Record<Role, Permission[]> = {
  super_admin: [
    'tenant.create', 'tenant.read', 'tenant.update', 'tenant.delete',
    'user.create', 'user.read', 'user.update', 'user.delete',
    'admin.create', 'admin.read', 'admin.update', 'admin.delete'
  ],
  platform_admin: [
    'tenant.create', 'tenant.read', 'tenant.update', 'tenant.delete',
    'user.read', 'user.update',
    'admin.read'
  ],
  admin: [
    'tenant.read', 'tenant.update',
    'user.create', 'user.read', 'user.update'
  ],
  user: [
    'user.read'
  ]
};

export class RBACService {
  static hasPermission(authState: AuthState, permission: Permission): boolean {
    if (!authState.isAuthenticated || !authState.adminRole) {
      return false;
    }

    const userRole = authState.adminRole as Role;
    const permissions = rolePermissions[userRole] || [];
    
    return permissions.includes(permission);
  }

  static hasAnyPermission(authState: AuthState, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(authState, permission));
  }

  static hasAllPermissions(authState: AuthState, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(authState, permission));
  }

  static hasRole(authState: AuthState, roles: Role[]): boolean {
    if (!authState.isAuthenticated || !authState.adminRole) {
      return false;
    }

    return roles.includes(authState.adminRole as Role);
  }

  static canAccessTenantManagement(authState: AuthState): boolean {
    return this.hasAnyPermission(authState, ['tenant.read', 'tenant.create', 'tenant.update']);
  }

  static canCreateTenant(authState: AuthState): boolean {
    return this.hasPermission(authState, 'tenant.create');
  }

  static canEditTenant(authState: AuthState): boolean {
    return this.hasPermission(authState, 'tenant.update');
  }

  static canDeleteTenant(authState: AuthState): boolean {
    return this.hasPermission(authState, 'tenant.delete');
  }
}
