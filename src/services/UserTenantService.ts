
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';

export interface UserTenantData {
  id: string;
  email: string;
  role_code: string;
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTenantStatus {
  authExists: boolean;
  tenantRelationshipExists: boolean;
  roleMatches: boolean;
  userId?: string;
  currentRole?: string;
  expectedRole?: string;
  issues: string[];
}

export interface TenantUserInvite {
  tenant_id: string;
  email: string;
  role_code: string;
  invited_by: string;
  expires_at?: string;
}

export class UserTenantService extends BaseService {
  private static instance: UserTenantService;

  private constructor() {
    super();
  }

  public static getInstance(): UserTenantService {
    if (!UserTenantService.instance) {
      UserTenantService.instance = new UserTenantService();
    }
    return UserTenantService.instance;
  }

  async getUsersByTenant(tenantId: string): Promise<ServiceResult<UserTenantData[]>> {
    return this.executeOperation(async () => {
      const { data: userTenants, error: userTenantsError } = await supabase
        .from('user_tenants')
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          is_active,
          is_primary,
          created_at,
          updated_at
        `)
        .eq('tenant_id', tenantId);

      if (userTenantsError) {
        throw new Error(`Failed to fetch user tenants: ${userTenantsError.message}`);
      }

      const userData: UserTenantData[] = [];

      for (const userTenant of userTenants || []) {
        try {
          // Get user profile data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', userTenant.user_id)
            .single();

          if (profileError || !profile) {
            console.warn(`Failed to get profile for user ${userTenant.user_id}:`, profileError);
            continue;
          }

          userData.push({
            id: userTenant.id,
            email: profile.email || 'Unknown',
            role_code: userTenant.role || 'tenant_user',
            is_active: userTenant.is_active,
            is_primary: userTenant.is_primary,
            created_at: userTenant.created_at,
            updated_at: userTenant.updated_at,
          });
        } catch (error) {
          console.error(`Error processing user tenant ${userTenant.id}:`, error);
        }
      }

      return userData;
    }, 'getUsersByTenant');
  }

  static async checkUserTenantStatus(email: string, tenantId: string): Promise<UserTenantStatus> {
    const issues: string[] = [];
    let authExists = false;
    let tenantRelationshipExists = false;
    let roleMatches = false;
    let userId: string | undefined;
    let currentRole: string | undefined;
    const expectedRole = 'tenant_admin';

    try {
      // Check if user exists in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (!profileError && profile) {
        authExists = true;
        userId = profile.id;
      } else {
        issues.push('User not found in system');
      }

      // Check tenant relationship if user exists
      if (userId) {
        const { data: userTenant, error: relationError } = await supabase
          .from('user_tenants')
          .select('role')
          .eq('user_id', userId)
          .eq('tenant_id', tenantId)
          .single();

        if (!relationError && userTenant) {
          tenantRelationshipExists = true;
          currentRole = userTenant.role || 'tenant_user';
          roleMatches = currentRole === expectedRole;
        } else {
          issues.push('User-tenant relationship missing');
        }
      }

      return {
        authExists,
        tenantRelationshipExists,
        roleMatches,
        userId,
        currentRole,
        expectedRole,
        issues
      };
    } catch (error) {
      console.error('Error checking user tenant status:', error);
      issues.push('Error checking status');
      return {
        authExists: false,
        tenantRelationshipExists: false,
        roleMatches: false,
        issues
      };
    }
  }

  static async ensureUserTenantRecord(userId: string, tenantId: string): Promise<ServiceResult<boolean>> {
    try {
      // Check if relationship already exists
      const { data: existing } = await supabase
        .from('user_tenants')
        .select('id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (existing) {
        return { success: true, data: true };
      }

      // Create the relationship with required fields
      const { error } = await supabase
        .from('user_tenants')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          role: 'tenant_user',
          is_active: true,
          is_primary: false
        });

      if (error) {
        throw new Error(`Failed to create user-tenant relationship: ${error.message}`);
      }

      return { success: true, data: true };
    } catch (error) {
      console.error('Error ensuring user tenant record:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create relationship'
      };
    }
  }

  async inviteUserToTenant(invite: TenantUserInvite): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      // Use admin_invites table with required fields
      const { error: inviteError } = await supabase
        .from('admin_invites')
        .insert({
          email: invite.email,
          invite_token: crypto.randomUUID(),
          role: invite.role_code,
          invited_by: invite.invited_by,
          expires_at: invite.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        });

      if (inviteError) {
        throw new Error(`Failed to create invitation: ${inviteError.message}`);
      }

      return true;
    }, 'inviteUserToTenant');
  }

  async removeUserFromTenant(tenantId: string, userId: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      const { error } = await supabase
        .from('user_tenants')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to remove user from tenant: ${error.message}`);
      }

      return true;
    }, 'removeUserFromTenant');
  }

  async updateUserTenantRole(tenantId: string, userId: string, roleId: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      const { error } = await supabase
        .from('user_tenants')
        .update({ 
          role: roleId,
          updated_at: new Date().toISOString() 
        })
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to update user role: ${error.message}`);
      }

      return true;
    }, 'updateUserTenantRole');
  }
}

export const userTenantService = UserTenantService.getInstance();
