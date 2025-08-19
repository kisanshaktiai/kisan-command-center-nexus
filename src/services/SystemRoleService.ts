
import { supabase } from '@/integrations/supabase/client';
import { SystemRole, SystemRoleCode } from '@/types/roles';

export class SystemRoleService {
  /**
   * Get all active system roles
   */
  static async getAllRoles(): Promise<SystemRole[]> {
    const { data, error } = await supabase
      .from('system_roles')
      .select('*')
      .eq('is_active', true)
      .order('role_level', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch system roles: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get role details by role code
   */
  static async getRoleByCode(roleCode: string): Promise<SystemRole | null> {
    const { data, error } = await supabase
      .from('system_roles')
      .select('*')
      .eq('role_code', roleCode)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    return data;
  }

  /**
   * Get user role details using the database function
   */
  static async getUserRoleDetails(userId: string, tenantId?: string) {
    const { data, error } = await supabase.rpc('get_user_role_details', {
      p_user_id: userId,
      p_tenant_id: tenantId || null
    });

    if (error) {
      throw new Error(`Failed to get user role details: ${error.message}`);
    }

    return data?.[0] || null;
  }

  /**
   * Check if user has specific permission
   */
  static async userHasPermission(userId: string, permission: string, tenantId?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_permission: permission,
      p_tenant_id: tenantId || null
    });

    if (error) {
      console.error('Failed to check user permission:', error);
      return false;
    }

    return Boolean(data);
  }

  /**
   * Get roles filtered by criteria
   */
  static async getRolesByFilter(filters: {
    isSystemRole?: boolean;
    minLevel?: number;
    maxLevel?: number;
  }): Promise<SystemRole[]> {
    let query = supabase
      .from('system_roles')
      .select('*')
      .eq('is_active', true);

    if (filters.isSystemRole !== undefined) {
      query = query.eq('is_system_role', filters.isSystemRole);
    }

    if (filters.minLevel !== undefined) {
      query = query.gte('role_level', filters.minLevel);
    }

    if (filters.maxLevel !== undefined) {
      query = query.lte('role_level', filters.maxLevel);
    }

    const { data, error } = await query.order('role_level', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch filtered roles: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Validate if role code exists and is active
   */
  static async validateRoleCode(roleCode: string): Promise<boolean> {
    const role = await this.getRoleByCode(roleCode);
    return role !== null;
  }
}
