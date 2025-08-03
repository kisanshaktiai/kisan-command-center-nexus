
export class AuthRules {
  static canCreateAdmin(userRole: string): boolean {
    return userRole === 'super_admin';
  }

  static canManageTenants(userRole: string): boolean {
    return ['super_admin', 'platform_admin'].includes(userRole);
  }

  static canViewBilling(userRole: string): boolean {
    return ['super_admin', 'platform_admin'].includes(userRole);
  }

  static canAccessSystemMetrics(userRole: string): boolean {
    return ['super_admin', 'platform_admin', 'admin'].includes(userRole);
  }

  static getPermissionsForRole(role: string) {
    const permissions = {
      super_admin: [
        'create_admin',
        'manage_tenants',
        'view_billing',
        'access_system_metrics',
        'manage_features',
        'view_audit_logs'
      ],
      platform_admin: [
        'manage_tenants',
        'view_billing',
        'access_system_metrics',
        'manage_features'
      ],
      admin: [
        'access_system_metrics',
        'view_tenants'
      ]
    };

    return permissions[role as keyof typeof permissions] || [];
  }

  static hasPermission(userRole: string, permission: string): boolean {
    const permissions = this.getPermissionsForRole(userRole);
    return permissions.includes(permission);
  }
}
