
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from '@/services/BaseService';

interface CreateUserTenantData {
  user_id: string;
  tenant_id: string;
  role_code: string;
  is_primary?: boolean;
  invited_by?: string;
  department?: string;
  designation?: string;
  employee_id?: string;
}

interface UpdateUserTenantData {
  role_code?: string;
  is_active?: boolean;
  is_primary?: boolean;
  department?: string;
  designation?: string;
  employee_id?: string;
}

export interface UserTenantStatus {
  id: string;
  user_id: string;
  tenant_id: string;
  role_code: string;
  is_active: boolean;
  is_primary: boolean;
  department?: string;
  designation?: string;
  employee_id?: string;
  created_at: string;
  updated_at: string;
  // Extended properties for status checking
  authExists?: boolean;
  tenantRelationshipExists?: boolean;
  roleMatches?: boolean;
  currentRole?: string;
  expectedRole?: string;
  issues?: string[];
  userId?: string;
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

  static async ensureUserTenantRecord(userId: string, tenantId: string, roleCode: string = 'tenant_admin'): Promise<ServiceResult<any>> {
    const instance = UserTenantService.getInstance();
    return instance.ensureUserTenantRecord(userId, tenantId, roleCode);
  }

  static async checkUserTenantStatus(email: string, tenantId: string): Promise<UserTenantStatus | null> {
    try {
      // First, get user from profiles table (which should have been synced from auth.users)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        return {
          id: '',
          user_id: '',
          tenant_id: tenantId,
          role_code: '',
          is_active: false,
          is_primary: false,
          created_at: '',
          updated_at: '',
          authExists: false,
          tenantRelationshipExists: false,
          roleMatches: false,
          issues: ['User not found in profiles'],
          expectedRole: 'tenant_admin',
          currentRole: undefined,
          userId: undefined
        } as UserTenantStatus;
      }

      const userId = profile.id;

      // Check user_tenants relationship
      const { data: userTenant, error: relationError } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      return {
        id: userTenant?.id || '',
        user_id: userId,
        tenant_id: tenantId,
        role_code: userTenant?.role_code || '',
        is_active: userTenant?.is_active || false,
        is_primary: userTenant?.is_primary || false,
        created_at: userTenant?.created_at || '',
        updated_at: userTenant?.updated_at || '',
        authExists: true,
        tenantRelationshipExists: !!userTenant,
        roleMatches: userTenant?.role_code === 'tenant_admin',
        currentRole: userTenant?.role_code || undefined,
        expectedRole: 'tenant_admin',
        issues: userTenant ? [] : ['User-tenant relationship missing'],
        userId: userId
      } as UserTenantStatus;
    } catch (error) {
      console.error('Error checking user tenant status:', error);
      return null;
    }
  }

  async ensureUserTenantRecord(userId: string, tenantId: string, roleCode: string = 'tenant_admin'): Promise<ServiceResult<any>> {
    return this.executeOperation(
      async () => {
        // Check if user-tenant relationship already exists
        const { data: existingRelation } = await supabase
          .from('user_tenants')
          .select('id, is_active')
          .eq('user_id', userId)
          .eq('tenant_id', tenantId)
          .single();

        if (existingRelation) {
          // Update existing relationship
          const updateData: any = {
            role_code: roleCode,
            is_active: true,
            is_primary: false,
            updated_at: new Date().toISOString()
          };

          const { data: updated, error: updateError } = await supabase
            .from('user_tenants')
            .update(updateData)
            .eq('id', existingRelation.id)
            .select()
            .single();

          if (updateError) throw updateError;
          return updated;
        } else {
          // Create new relationship
          const insertData: any = {
            user_id: userId,
            tenant_id: tenantId,
            role_code: roleCode,
            is_active: true,
            is_primary: false,
            joined_at: new Date().toISOString()
          };

          const { data: created, error: createError } = await supabase
            .from('user_tenants')
            .insert(insertData)
            .select()
            .single();

          if (createError) throw createError;
          return created;
        }
      },
      'ensureUserTenantRecord'
    );
  }

  async createUserTenant(data: CreateUserTenantData): Promise<ServiceResult<any>> {
    return this.executeOperation(
      async () => {
        // Map platform_admin to super_admin if needed for compatibility
        let roleCode = data.role_code;
        if (roleCode === 'platform_admin') {
          roleCode = 'super_admin';
        }

        // Check if user-tenant relationship already exists
        const { data: existingRelation } = await supabase
          .from('user_tenants')
          .select('id, is_active')
          .eq('user_id', data.user_id)
          .eq('tenant_id', data.tenant_id)
          .single();

        if (existingRelation) {
          // Update existing relationship
          const updateData: any = {
            role_code: roleCode,
            is_active: true,
            is_primary: data.is_primary || false,
            invited_by: data.invited_by,
            department: data.department,
            designation: data.designation,
            employee_id: data.employee_id,
            updated_at: new Date().toISOString()
          };

          const { data: updated, error: updateError } = await supabase
            .from('user_tenants')
            .update(updateData)
            .eq('id', existingRelation.id)
            .select()
            .single();

          if (updateError) throw updateError;
          return updated;
        } else {
          // Create new relationship
          const insertData: any = {
            user_id: data.user_id,
            tenant_id: data.tenant_id,
            role_code: roleCode,
            is_active: true,
            is_primary: data.is_primary || false,
            invited_by: data.invited_by,
            department: data.department,
            designation: data.designation,
            employee_id: data.employee_id,
            joined_at: new Date().toISOString()
          };

          const { data: created, error: createError } = await supabase
            .from('user_tenants')
            .insert(insertData)
            .select()
            .single();

          if (createError) throw createError;
          return created;
        }
      },
      'createUserTenant'
    );
  }

  async updateUserTenant(id: string, data: UpdateUserTenantData): Promise<ServiceResult<any>> {
    return this.executeOperation(
      async () => {
        const { data: updated, error } = await supabase
          .from('user_tenants')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      },
      'updateUserTenant'
    );
  }

  async getUserTenants(userId: string): Promise<ServiceResult<any[]>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('user_tenants')
          .select(`
            *,
            tenants (*)
          `)
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      },
      'getUserTenants'
    );
  }

  async getTenantUsers(tenantId: string): Promise<ServiceResult<any[]>> {
    return this.executeOperation(
      async () => {
        const { data, error } = await supabase
          .from('user_tenants')
          .select(`
            *,
            profiles (
              id,
              full_name,
              email,
              phone,
              avatar_url
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      },
      'getTenantUsers'
    );
  }

  async removeUserFromTenant(userId: string, tenantId: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const { error } = await supabase
          .from('user_tenants')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('tenant_id', tenantId);

        if (error) throw error;
        return true;
      },
      'removeUserFromTenant'
    );
  }
}

export const userTenantService = UserTenantService.getInstance();
