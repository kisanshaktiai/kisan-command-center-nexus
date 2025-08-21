
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
          role_id,
          is_active,
          is_primary,
          created_at,
          updated_at
        `)
        .eq('tenant_id', tenantId);

      if (userTenantsError) {
        throw new Error(`Failed to fetch user tenants: ${userTenantsError.message}`);
      }

      // For each user tenant, get the user profile data
      const userData: UserTenantData[] = [];

      for (const userTenant of userTenants || []) {
        try {
          // Get user profile data
          const { data: profile, error: profileError } = await supabase
            .from('user_tenants')
            .select('*')
            .eq('user_id', userTenant.user_id)
            .single();

          if (profileError) {
            console.warn(`Failed to get profile for user ${userTenant.user_id}:`, profileError);
            continue;
          }

          userData.push({
            id: userTenant.id,
            email: profile?.email || 'Unknown',
            role_code: 'user', // Default role since role_code doesn't exist in current schema
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

  async inviteUserToTenant(invite: TenantUserInvite): Promise<ServiceResult<boolean>> {
    return this.executeOperation(async () => {
      // Create the tenant invitation
      const { error: inviteError } = await supabase
        .from('tenant_invitations')
        .insert({
          tenant_id: invite.tenant_id,
          email: invite.email,
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
        .update({ role_id: roleId, updated_at: new Date().toISOString() })
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
