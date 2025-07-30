
export class PermissionsManager {
  static readonly ROLES = {
    SUPER_ADMIN: 'super_admin',
    PLATFORM_ADMIN: 'platform_admin',
    ADMIN: 'admin',
    TENANT_OWNER: 'tenant_owner',
    TENANT_ADMIN: 'tenant_admin',
    USER: 'user'
  } as const;

  static readonly PERMISSIONS = {
    CREATE_TENANT: 'create_tenant',
    MANAGE_BILLING: 'manage_billing',
    VIEW_SYSTEM_METRICS: 'view_system_metrics',
    MANAGE_USERS: 'manage_users',
    VIEW_AUDIT_LOGS: 'view_audit_logs',
    CONFIGURE_FEATURES: 'configure_features',
    ACCESS_API: 'access_api'
  } as const;

  private static rolePermissions = {
    [this.ROLES.SUPER_ADMIN]: [
      this.PERMISSIONS.CREATE_TENANT,
      this.PERMISSIONS.MANAGE_BILLING,
      this.PERMISSIONS.VIEW_SYSTEM_METRICS,
      this.PERMISSIONS.MANAGE_USERS,
      this.PERMISSIONS.VIEW_AUDIT_LOGS,
      this.PERMISSIONS.CONFIGURE_FEATURES,
      this.PERMISSIONS.ACCESS_API
    ],
    [this.ROLES.PLATFORM_ADMIN]: [
      this.PERMISSIONS.CREATE_TENANT,
      this.PERMISSIONS.MANAGE_BILLING,
      this.PERMISSIONS.VIEW_SYSTEM_METRICS,
      this.PERMISSIONS.MANAGE_USERS,
      this.PERMISSIONS.CONFIGURE_FEATURES
    ],
    [this.ROLES.ADMIN]: [
      this.PERMISSIONS.VIEW_SYSTEM_METRICS,
      this.PERMISSIONS.MANAGE_USERS
    ],
    [this.ROLES.TENANT_OWNER]: [
      this.PERMISSIONS.MANAGE_BILLING,
      this.PERMISSIONS.MANAGE_USERS,
      this.PERMISSIONS.CONFIGURE_FEATURES,
      this.PERMISSIONS.ACCESS_API
    ],
    [this.ROLES.TENANT_ADMIN]: [
      this.PERMISSIONS.MANAGE_USERS,
      this.PERMISSIONS.ACCESS_API
    ],
    [this.ROLES.USER]: [
      this.PERMISSIONS.ACCESS_API
    ]
  };

  static hasPermission(userRole: string, permission: string): boolean {
    const permissions = this.rolePermissions[userRole as keyof typeof this.rolePermissions];
    return permissions?.includes(permission) || false;
  }

  static getRolePermissions(role: string): string[] {
    return this.rolePermissions[role as keyof typeof this.rolePermissions] || [];
  }

  static canAccessResource(userRole: string, resource: string, action: string): boolean {
    const permission = `${action}_${resource}`;
    return this.hasPermission(userRole, permission);
  }

  static isHigherRole(currentRole: string, targetRole: string): boolean {
    const roleHierarchy = [
      this.ROLES.USER,
      this.ROLES.TENANT_ADMIN,
      this.ROLES.TENANT_OWNER,
      this.ROLES.ADMIN,
      this.ROLES.PLATFORM_ADMIN,
      this.ROLES.SUPER_ADMIN
    ];

    const currentIndex = roleHierarchy.indexOf(currentRole as any);
    const targetIndex = roleHierarchy.indexOf(targetRole as any);

    return currentIndex > targetIndex;
  }
}
