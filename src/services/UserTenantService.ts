
import { supabase } from '@/integrations/supabase/client';
import { SystemRoleService } from './SystemRoleService';
import { SYSTEM_ROLE_CODES, type SystemRoleCode } from '@/types/roles';

export interface UserTenantRelationship {
  user_id: string;
  tenant_id: string;
  role: SystemRoleCode;
  is_active: boolean;
  metadata?: Record<string, any>;
}

export interface CreateUserTenantRequest {
  user_id: string;
  tenant_id: string;
  role: SystemRoleCode;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export class UserTenantService {
  /**
   * Create a new user-tenant relationship
   */
  static async createUserTenant(request: CreateUserTenantRequest): Promise<UserTenantRelationship> {
    console.log('UserTenantService: Creating user-tenant relationship', request);

    // Validate role code exists
    const isValidRole = await SystemRoleService.validateRoleCode(request.role);
    if (!isValidRole) {
      throw new Error(`Invalid role code: ${request.role}`);
    }

    try {
      // Use direct insert to avoid RPC function issues
      const { data, error } = await supabase
        .from('user_tenants')
        .insert({
          user_id: request.user_id,
          tenant_id: request.tenant_id,
          role: request.role,
          is_active: request.is_active ?? true,
          metadata: request.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('UserTenantService: Insert error:', error);
        throw new Error(`Failed to create user-tenant relationship: ${error.message}`);
      }

      console.log('UserTenantService: Successfully created relationship:', data);
      return data;

    } catch (error) {
      console.error('UserTenantService: Unexpected error:', error);
      throw error;
    }
  }

  /**
   * Update an existing user-tenant relationship
   */
  static async updateUserTenant(
    userId: string, 
    tenantId: string, 
    updates: Partial<Omit<CreateUserTenantRequest, 'user_id' | 'tenant_id'>>
  ): Promise<UserTenantRelationship> {
    console.log('UserTenantService: Updating user-tenant relationship', { userId, tenantId, updates });

    // Validate role if provided
    if (updates.role) {
      const isValidRole = await SystemRoleService.validateRoleCode(updates.role);
      if (!isValidRole) {
        throw new Error(`Invalid role code: ${updates.role}`);
      }
    }

    const { data, error } = await supabase
      .from('user_tenants')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('UserTenantService: Update error:', error);
      throw new Error(`Failed to update user-tenant relationship: ${error.message}`);
    }

    console.log('UserTenantService: Successfully updated relationship:', data);
    return data;
  }

  /**
   * Get user-tenant relationships for a user
   */
  static async getUserTenants(userId: string): Promise<UserTenantRelationship[]> {
    const { data, error } = await supabase
      .from('user_tenants')
      .select(`
        *,
        system_roles!fk_user_tenants_role (
          role_name,
          role_level,
          permissions
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch user tenants: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all users for a tenant with their roles
   */
  static async getTenantUsers(tenantId: string): Promise<UserTenantRelationship[]> {
    const { data, error } = await supabase
      .from('user_tenants')
      .select(`
        *,
        system_roles!fk_user_tenants_role (
          role_name,
          role_level,
          permissions
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch tenant users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Remove user from tenant (deactivate)
   */
  static async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('user_tenants')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to remove user from tenant: ${error.message}`);
    }
  }

  /**
   * Check if user has access to tenant
   */
  static async userHasTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_tenants')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking tenant access:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Get user's role in a specific tenant
   */
  static async getUserTenantRole(userId: string, tenantId: string): Promise<SystemRoleCode | null> {
    const { data, error } = await supabase
      .from('user_tenants')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No relationship found
      }
      throw new Error(`Failed to get user tenant role: ${error.message}`);
    }

    return data.role as SystemRoleCode;
  }

  /**
   * Create tenant owner relationship
   */
  static async createTenantOwner(userId: string, tenantId: string): Promise<UserTenantRelationship> {
    return this.createUserTenant({
      user_id: userId,
      tenant_id: tenantId,
      role: SYSTEM_ROLE_CODES.TENANT_OWNER,
      is_active: true,
      metadata: {
        created_as: 'owner',
        created_at: new Date().toISOString()
      }
    });
  }

  /**
   * Create tenant admin relationship
   */
  static async createTenantAdmin(userId: string, tenantId: string): Promise<UserTenantRelationship> {
    return this.createUserTenant({
      user_id: userId,
      tenant_id: tenantId,
      role: SYSTEM_ROLE_CODES.TENANT_ADMIN,
      is_active: true,
      metadata: {
        created_as: 'admin',
        created_at: new Date().toISOString()
      }
    });
  }
}
