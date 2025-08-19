
import { SYSTEM_ROLE_CODES, SystemRoleCode } from '@/types/roles';
import { Permission } from '@/types/enums';
import { supabase } from '@/integrations/supabase/client';

export interface RBACContext {
  userId: string;
  userRole: SystemRoleCode;
  tenantId?: string;
  tenantRole?: SystemRoleCode;
  permissions: Permission[];
}

// Cache for role permissions from database
const rolePermissionsCache = new Map<string, Permission[]>();

export class RBACService {
  
  static async getPermissionsForRole(roleCode: SystemRoleCode): Promise<Permission[]> {
    // Check cache first
    if (rolePermissionsCache.has(roleCode)) {
      return rolePermissionsCache.get(roleCode)!;
    }

    try {
      const { data: roleData, error } = await supabase
        .from('system_roles')
        .select('permissions')
        .eq('role_code', roleCode)
        .eq('is_active', true)
        .single();

      if (error || !roleData) {
        console.error('Error fetching role permissions:', error);
        return [];
      }

      const permissions = roleData.permissions as Permission[];
      rolePermissionsCache.set(roleCode, permissions);
      return permissions;
    } catch (error) {
      console.error('Error in getPermissionsForRole:', error);
      return [];
    }
  }

  static hasPermission(context: RBACContext, permission: Permission): boolean {
    return context.permissions.includes(permission) || 
           context.permissions.includes(Permission.SYSTEM_ADMIN);
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

  static async buildContext(
    userId: string, 
    userRole: SystemRoleCode, 
    tenantId?: string, 
    tenantRole?: SystemRoleCode
  ): Promise<RBACContext> {
    const basePermissions = await this.getPermissionsForRole(userRole);
    const tenantPermissions = tenantRole ? await this.getPermissionsForRole(tenantRole) : [];
    
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

  static async getRoleLevel(roleCode: SystemRoleCode): Promise<number> {
    try {
      const { data } = await supabase
        .rpc('get_role_level', { p_role_code: roleCode });
      return data || 0;
    } catch (error) {
      console.error('Error getting role level:', error);
      return 0;
    }
  }

  static async isRoleActive(roleCode: SystemRoleCode): Promise<boolean> {
    try {
      const { data } = await supabase
        .rpc('is_system_role_active', { p_role_code: roleCode });
      return data || false;
    } catch (error) {
      console.error('Error checking role active status:', error);
      return false;
    }
  }
}

// Export types and enums for use in other modules
export { Permission };
// Export SystemRoleCode as Role for compatibility
export type Role = SystemRoleCode;
export type { SystemRoleCode as UserRole };
