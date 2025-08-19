
import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from '@/services/BaseService';
import { SystemRoleCode } from '@/types/enums';

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

  async ensureUserTenantRecord(userId: string, tenantId: string, roleCode: string): Promise<ServiceResult<any>> {
    return this.createUserTenant({
      user_id: userId,
      tenant_id: tenantId,
      role_code: roleCode
    });
  }

  async createUserTenant(data: CreateUserTenantData): Promise<ServiceResult<any>> {
    return this.executeOperation(
      async () => {
        // Validate role exists in system_roles
        const { data: role, error: roleError } = await supabase
          .from('system_roles')
          .select('role_code')
          .eq('role_code', data.role_code)
          .eq('is_active', true)
          .single();

        if (roleError || !role) {
          throw new Error(`Invalid role: ${data.role_code}`);
        }

        // Map platform_admin to super_admin if needed for compatibility
        let roleCode = data.role_code;
        if (roleCode === SystemRoleCode.PLATFORM_ADMIN) {
          roleCode = SystemRoleCode.SUPER_ADMIN;
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
        // Validate role if provided
        if (data.role_code) {
          const { data: role, error: roleError } = await supabase
            .from('system_roles')
            .select('role_code')
            .eq('role_code', data.role_code)
            .eq('is_active', true)
            .single();

          if (roleError || !role) {
            throw new Error(`Invalid role: ${data.role_code}`);
          }
        }

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
            tenants (*),
            system_roles (*)
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
            ),
            system_roles (*)
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
