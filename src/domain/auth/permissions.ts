
export type Role = 'super_admin' | 'tenant_admin' | 'tenant_user' | 'farmer';
export type Permission = 'read' | 'write' | 'delete' | 'admin';
export type Resource = 'tenants' | 'users' | 'billing' | 'metrics' | 'settings';

interface RolePermissions {
  [key: string]: {
    [resource in Resource]?: Permission[];
  };
}

export const rolePermissions: RolePermissions = {
  super_admin: {
    tenants: ['read', 'write', 'delete', 'admin'],
    users: ['read', 'write', 'delete', 'admin'],
    billing: ['read', 'write', 'delete', 'admin'],
    metrics: ['read', 'write', 'admin'],
    settings: ['read', 'write', 'admin']
  },
  tenant_admin: {
    tenants: ['read', 'write'],
    users: ['read', 'write', 'delete'],
    billing: ['read'],
    metrics: ['read'],
    settings: ['read', 'write']
  },
  tenant_user: {
    tenants: ['read'],
    users: ['read'],
    billing: ['read'],
    metrics: ['read'],
    settings: ['read']
  },
  farmer: {
    tenants: [],
    users: ['read'],
    billing: ['read'],
    metrics: ['read'],
    settings: ['read']
  }
};

export class PermissionService {
  static hasPermission(
    userRole: Role,
    resource: Resource,
    permission: Permission
  ): boolean {
    const rolePerms = rolePermissions[userRole];
    if (!rolePerms || !rolePerms[resource]) return false;
    
    return rolePerms[resource]!.includes(permission);
  }

  static canAccessResource(userRole: Role, resource: Resource): boolean {
    return this.hasPermission(userRole, resource, 'read');
  }

  static canModifyResource(userRole: Role, resource: Resource): boolean {
    return this.hasPermission(userRole, resource, 'write');
  }

  static canDeleteResource(userRole: Role, resource: Resource): boolean {
    return this.hasPermission(userRole, resource, 'delete');
  }

  static canAdministerResource(userRole: Role, resource: Resource): boolean {
    return this.hasPermission(userRole, resource, 'admin');
  }

  static getAccessibleResources(userRole: Role): Resource[] {
    const rolePerms = rolePermissions[userRole];
    if (!rolePerms) return [];
    
    return Object.keys(rolePerms).filter(resource => 
      rolePerms[resource as Resource]!.length > 0
    ) as Resource[];
  }
}
