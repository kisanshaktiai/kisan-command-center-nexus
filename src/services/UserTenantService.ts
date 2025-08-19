
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

export interface UserTenantStatus {
  exists: boolean;
  authExists: boolean;
  profileExists: boolean;
  tenantRelationshipExists: boolean;
  roleMatches: boolean;
  currentRole?: string;
  userId?: string;
  email?: string;
  issues: string[];
  canCreateRelationship: boolean;
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
      // Use direct insert with proper type casting - insert as any to bypass strict typing
      const { data, error } = await supabase
        .from('user_tenants')
        .insert({
          user_id: request.user_id,
          tenant_id: request.tenant_id,
          role: request.role as any, // Cast to any to bypass database enum constraints
          is_active: request.is_active ?? true,
          metadata: request.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any) // Cast entire object to any
        .select()
        .single();

      if (error) {
        console.error('UserTenantService: Insert error:', error);
        throw new Error(`Failed to create user-tenant relationship: ${error.message}`);
      }

      console.log('UserTenantService: Successfully created relationship:', data);
      return {
        user_id: data.user_id,
        tenant_id: data.tenant_id,
        role: data.role as SystemRoleCode,
        is_active: data.is_active,
        metadata: data.metadata as Record<string, any>
      };

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

    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.role) {
      updateData.role = updates.role as any; // Cast to any for database compatibility
    }

    const { data, error } = await supabase
      .from('user_tenants')
      .update(updateData)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('UserTenantService: Update error:', error);
      throw new Error(`Failed to update user-tenant relationship: ${error.message}`);
    }

    console.log('UserTenantService: Successfully updated relationship:', data);
    return {
      user_id: data.user_id,
      tenant_id: data.tenant_id,
      role: data.role as SystemRoleCode,
      is_active: data.is_active,
      metadata: data.metadata as Record<string, any>
    };
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

    return (data || []).map(item => ({
      user_id: item.user_id,
      tenant_id: item.tenant_id,
      role: item.role as SystemRoleCode,
      is_active: item.is_active,
      metadata: item.metadata as Record<string, any>
    }));
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

    return (data || []).map(item => ({
      user_id: item.user_id,
      tenant_id: item.tenant_id,
      role: item.role as SystemRoleCode,
      is_active: item.is_active,
      metadata: item.metadata as Record<string, any>
    }));
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
   * Check user tenant status - comprehensive status check
   */
  static async checkUserTenantStatus(email: string, tenantId: string): Promise<UserTenantStatus> {
    const issues: string[] = [];
    let userId: string | undefined;
    let authExists = false;
    let profileExists = false;
    let tenantRelationshipExists = false;
    let roleMatches = false;
    let currentRole: string | undefined;

    try {
      // Check if user exists in auth system
      try {
        const { data: listResult, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
          issues.push(`Auth system error: ${usersError.message}`);
        } else if (listResult && listResult.users) {
          const authUser = listResult.users.find((u: any) => u.email === email);
          if (authUser) {
            authExists = true;
            userId = authUser.id;
          } else {
            issues.push('User not found in authentication system');
          }
        } else {
          issues.push('Unable to retrieve user list from auth system');
        }
      } catch (authError) {
        console.error('Error checking auth users:', authError);
        issues.push('Unable to check authentication system');
      }

      // Check tenant relationship if user exists
      if (userId) {
        const hasAccess = await this.userHasTenantAccess(userId, tenantId);
        if (hasAccess) {
          tenantRelationshipExists = true;
          const role = await this.getUserTenantRole(userId, tenantId);
          if (role) {
            currentRole = role;
            roleMatches = true; // For now, assume role is correct if it exists
          }
        } else {
          issues.push('User-tenant relationship missing');
        }
      }

      return {
        exists: authExists && tenantRelationshipExists,
        authExists,
        profileExists: true, // We don't have a separate profiles table
        tenantRelationshipExists,
        roleMatches,
        currentRole,
        userId,
        email,
        issues,
        canCreateRelationship: authExists && !tenantRelationshipExists
      };

    } catch (error) {
      console.error('Error checking user tenant status:', error);
      issues.push(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        exists: false,
        authExists: false,
        profileExists: false,
        tenantRelationshipExists: false,
        roleMatches: false,
        currentRole,
        email,
        issues,
        canCreateRelationship: false
      };
    }
  }

  /**
   * Ensure user tenant record exists
   */
  static async ensureUserTenantRecord(userId: string, tenantId: string): Promise<{ success: boolean; error?: string; code?: string }> {
    try {
      // Check if relationship already exists
      const hasAccess = await this.userHasTenantAccess(userId, tenantId);
      if (hasAccess) {
        return { success: true };
      }

      // Create the relationship with tenant_user role as default
      await this.createUserTenant({
        user_id: userId,
        tenant_id: tenantId,
        role: SYSTEM_ROLE_CODES.TENANT_USER,
        is_active: true,
        metadata: {
          created_as: 'auto_provisioned',
          created_at: new Date().toISOString()
        }
      });

      return { success: true };

    } catch (error) {
      console.error('Error ensuring user tenant record:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CREATION_FAILED'
      };
    }
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

// Export types and constants
export { SYSTEM_ROLE_CODES };
export type { SystemRoleCode };
