
import { supabase } from '@/integrations/supabase/client';
import { SystemRoleCode } from '@/types/roles';

export class SystemRoleService {
  /**
   * Validate if a role code exists and is active
   */
  static async validateRoleCode(roleCode: SystemRoleCode): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('system_roles')
        .select('role_code')
        .eq('role_code', roleCode)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('SystemRoleService: Error validating role code:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('SystemRoleService: Unexpected error validating role code:', error);
      return false;
    }
  }

  /**
   * Get all active system roles
   */
  static async getActiveRoles() {
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
   * Get role by code
   */
  static async getRoleByCode(roleCode: SystemRoleCode) {
    const { data, error } = await supabase
      .from('system_roles')
      .select('*')
      .eq('role_code', roleCode)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    return data;
  }
}
