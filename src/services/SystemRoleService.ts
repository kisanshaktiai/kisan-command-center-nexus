import { supabase } from '@/integrations/supabase/client';
import { SystemRole, SystemRoleCode } from '@/types/roles';

export class SystemRoleService {
  /**
   * Get all active system roles
   */
  static async getAllRoles(): Promise<SystemRole[]> {
    try {
      // Since RPC functions don't exist yet, use fallback
      console.log('SystemRoleService: Using fallback roles (RPC functions not available)');
      return this.getFallbackRoles();
    } catch (error) {
      console.error('SystemRoleService: Unexpected error:', error);
      return this.getFallbackRoles();
    }
  }

  /**
   * Get role details by role code
   */
  static async getRoleByCode(roleCode: string): Promise<SystemRole | null> {
    try {
      // Since RPC functions don't exist yet, use fallback
      return this.getFallbackRoleByCode(roleCode);
    } catch (error) {
      console.error('SystemRoleService: Unexpected error:', error);
      return this.getFallbackRoleByCode(roleCode);
    }
  }

  /**
   * Get user role details using the database function
   */
  static async getUserRoleDetails(userId: string, tenantId?: string) {
    try {
      // Since RPC functions don't exist yet, return null
      console.log('SystemRoleService: getUserRoleDetails not available yet');
      return null;
    } catch (error) {
      console.error('SystemRoleService: Unexpected error:', error);
      return null;
    }
  }

  /**
   * Check if user has specific permission
   */
  static async userHasPermission(userId: string, permission: string, tenantId?: string): Promise<boolean> {
    try {
      // Since RPC functions don't exist yet, return false for safety
      console.log('SystemRoleService: userHasPermission not available yet');
      return false;
    } catch (error) {
      console.error('SystemRoleService: Unexpected error checking permission:', error);
      return false;
    }
  }

  /**
   * Get roles filtered by criteria
   */
  static async getRolesByFilter(filters: {
    isSystemRole?: boolean;
    minLevel?: number;
    maxLevel?: number;
  }): Promise<SystemRole[]> {
    // Return fallback filtered roles for now
    const allRoles = this.getFallbackRoles();
    
    return allRoles.filter(role => {
      if (filters.isSystemRole !== undefined && role.is_system_role !== filters.isSystemRole) {
        return false;
      }
      if (filters.minLevel !== undefined && role.role_level < filters.minLevel) {
        return false;
      }
      if (filters.maxLevel !== undefined && role.role_level > filters.maxLevel) {
        return false;
      }
      return true;
    });
  }

  /**
   * Validate if role code exists and is active
   */
  static async validateRoleCode(roleCode: string): Promise<boolean> {
    const role = await this.getRoleByCode(roleCode);
    return role !== null && role.is_active;
  }

  /**
   * Fallback roles when database is not accessible
   */
  private static getFallbackRoles(): SystemRole[] {
    return [
      {
        id: '1',
        role_code: 'super_admin',
        role_name: 'Super Administrator',
        role_description: 'Full system access with all permissions',
        role_level: 100,
        permissions: ['system:*', 'tenant:*', 'user:*', 'billing:*', 'analytics:*'],
        is_active: true,
        is_system_role: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        role_code: 'platform_admin',
        role_name: 'Platform Administrator',
        role_description: 'Platform-wide administration with limited system access',
        role_level: 90,
        permissions: ['tenant:*', 'user:read', 'user:write', 'billing:read', 'analytics:read'],
        is_active: true,
        is_system_role: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        role_code: 'tenant_owner',
        role_name: 'Tenant Owner',
        role_description: 'Full ownership of tenant with billing and admin rights',
        role_level: 80,
        permissions: ['tenant:admin', 'user:*', 'billing:admin', 'analytics:admin', 'api:admin'],
        is_active: true,
        is_system_role: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        role_code: 'tenant_admin',
        role_name: 'Tenant Administrator',
        role_description: 'Full tenant administration without billing access',
        role_level: 70,
        permissions: ['tenant:admin', 'user:*', 'analytics:read', 'api:write'],
        is_active: true,
        is_system_role: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '5',
        role_code: 'tenant_manager',
        role_name: 'Tenant Manager',
        role_description: 'Tenant management with limited user permissions',
        role_level: 60,
        permissions: ['tenant:write', 'user:read', 'user:write', 'analytics:read'],
        is_active: true,
        is_system_role: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '6',
        role_code: 'dealer',
        role_name: 'Dealer',
        role_description: 'Product dealer with sales and customer management',
        role_level: 40,
        permissions: ['products:read', 'customers:write', 'orders:write', 'commission:read'],
        is_active: true,
        is_system_role: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '7',
        role_code: 'agent',
        role_name: 'Field Agent',
        role_description: 'Field operations and farmer support',
        role_level: 35,
        permissions: ['farmers:read', 'farmers:write', 'tasks:write', 'reports:read'],
        is_active: true,
        is_system_role: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '8',
        role_code: 'farmer',
        role_name: 'Farmer',
        role_description: 'End user farmer with basic platform access',
        role_level: 20,
        permissions: ['profile:write', 'crops:write', 'weather:read', 'marketplace:read'],
        is_active: true,
        is_system_role: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '9',
        role_code: 'tenant_user',
        role_name: 'Tenant User',
        role_description: 'Basic tenant user with limited access',
        role_level: 10,
        permissions: ['profile:write', 'dashboard:read'],
        is_active: true,
        is_system_role: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  /**
   * Get fallback role by code
   */
  private static getFallbackRoleByCode(roleCode: string): SystemRole | null {
    const roles = this.getFallbackRoles();
    return roles.find(role => role.role_code === roleCode) || null;
  }
}
