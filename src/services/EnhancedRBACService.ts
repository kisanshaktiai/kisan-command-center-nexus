
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  PLATFORM_ADMIN = 'platform_admin', 
  TENANT_ADMIN = 'tenant_admin',
  TENANT_USER = 'tenant_user',
  FARMER = 'farmer',
  DEALER = 'dealer'
}

export enum Permission {
  // System-wide permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_METRICS = 'system:metrics',
  
  // Tenant management
  TENANT_CREATE = 'tenant:create',
  TENANT_READ = 'tenant:read',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',
  TENANT_CONFIG = 'tenant:config',
  
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_INVITE = 'user:invite',
  
  // Admin management
  ADMIN_CREATE = 'admin:create',
  ADMIN_READ = 'admin:read',
  ADMIN_UPDATE = 'admin:update',
  ADMIN_DELETE = 'admin:delete',
  
  // Billing
  BILLING_READ = 'billing:read',
  BILLING_UPDATE = 'billing:update',
  BILLING_ADMIN = 'billing:admin',
  
  // Analytics
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_ADMIN = 'analytics:admin',
  
  // API access
  API_READ = 'api:read',
  API_WRITE = 'api:write',
  API_ADMIN = 'api:admin'
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_CONFIG,
    Permission.SYSTEM_METRICS,
    Permission.TENANT_CREATE,
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.TENANT_DELETE,
    Permission.TENANT_CONFIG,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_INVITE,
    Permission.ADMIN_CREATE,
    Permission.ADMIN_READ,
    Permission.ADMIN_UPDATE,
    Permission.ADMIN_DELETE,
    Permission.BILLING_ADMIN,
    Permission.ANALYTICS_ADMIN,
    Permission.API_ADMIN
  ],
  
  [UserRole.PLATFORM_ADMIN]: [
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.TENANT_CONFIG,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_INVITE,
    Permission.ADMIN_READ,
    Permission.BILLING_READ,
    Permission.BILLING_UPDATE,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_EXPORT,
    Permission.API_READ
  ],
  
  [UserRole.TENANT_ADMIN]: [
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_INVITE,
    Permission.BILLING_READ,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_EXPORT,
    Permission.API_READ,
    Permission.API_WRITE
  ],
  
  [UserRole.TENANT_USER]: [
    Permission.USER_READ,
    Permission.ANALYTICS_READ,
    Permission.API_READ
  ],
  
  [UserRole.FARMER]: [
    Permission.USER_READ,
    Permission.ANALYTICS_READ
  ],
  
  [UserRole.DEALER]: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.ANALYTICS_READ
  ]
};

export interface RBACContext {
  userId: string;
  userRole: UserRole;
  tenantId?: string;
  tenantRole?: UserRole;
  permissions: Permission[];
}

export class EnhancedRBACService {
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
    
    // Combine permissions, with user role taking precedence
    const allPermissions = [...new Set([...basePermissions, ...tenantPermissions])];
    
    return {
      userId,
      userRole,
      tenantId,
      tenantRole,
      permissions: allPermissions
    };
  }

  static canAccessResource(
    context: RBACContext, 
    resource: string, 
    action: 'create' | 'read' | 'update' | 'delete'
  ): boolean {
    const permission = `${resource}:${action}` as Permission;
    return this.hasPermission(context, permission);
  }

  static canAccessTenant(context: RBACContext, targetTenantId: string): boolean {
    // Super admins can access all tenants
    if (context.userRole === UserRole.SUPER_ADMIN) {
      return true;
    }
    
    // Platform admins can access most tenants (with some restrictions)
    if (context.userRole === UserRole.PLATFORM_ADMIN) {
      return true;
    }
    
    // Tenant users can only access their own tenant
    return context.tenantId === targetTenantId;
  }

  static getAccessibleActions(context: RBACContext, resource: string): string[] {
    const actions = ['create', 'read', 'update', 'delete'];
    return actions.filter(action => 
      this.canAccessResource(context, resource, action as any)
    );
  }

  static isSystemAdmin(context: RBACContext): boolean {
    return this.hasRole(context, [UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN]);
  }

  static isTenantAdmin(context: RBACContext): boolean {
    return this.hasRole(context, [UserRole.TENANT_ADMIN]) || this.isSystemAdmin(context);
  }
}
