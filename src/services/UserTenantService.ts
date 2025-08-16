
import { supabase } from '@/integrations/supabase/client';

export interface ManageUserTenantRequest {
  user_id: string;
  tenant_id: string;
  role: 'super_admin' | 'platform_admin' | 'tenant_admin' | 'tenant_user' | 'farmer' | 'dealer';
  is_active?: boolean;
  metadata?: Record<string, any>;
  operation?: 'insert' | 'update' | 'upsert';
}

export interface UserTenantResponse {
  success: boolean;
  error?: string;
  code?: string;
  relationship_id?: string;
  operation?: string;
  user_id?: string;
  tenant_id?: string;
  role?: string;
  is_active?: boolean;
  message?: string;
  request_id?: string;
  correlation_id?: string;
}

export interface UserTenantStatus {
  authExists: boolean;
  tenantRelationshipExists: boolean;
  roleMatches: boolean;
  currentRole?: string;
  expectedRole: string;
  userId?: string;
  issues: string[];
}

export class UserTenantService {
  /**
   * Create or update a user-tenant relationship
   */
  static async manageUserTenantRelationship(
    request: ManageUserTenantRequest
  ): Promise<UserTenantResponse> {
    try {
      console.log('UserTenantService: Managing user-tenant relationship:', request);

      const { data, error } = await supabase.functions.invoke('manage-user-tenant', {
        body: request,
        headers: {
          'x-request-id': `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          'x-correlation-id': `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }
      });

      if (error) {
        console.error('UserTenantService: Edge function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to manage user-tenant relationship',
          code: 'EDGE_FUNCTION_ERROR'
        };
      }

      console.log('UserTenantService: Successfully managed relationship:', data);
      return data as UserTenantResponse;

    } catch (error: any) {
      console.error('UserTenantService: Unexpected error:', error);
      return {
        success: false,
        error: error.message || 'Unexpected error occurred',
        code: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Create a tenant admin relationship when a new tenant is created
   */
  static async createTenantAdminRelationship(
    userId: string,
    tenantId: string,
    metadata?: Record<string, any>
  ): Promise<UserTenantResponse> {
    return this.manageUserTenantRelationship({
      user_id: userId,
      tenant_id: tenantId,
      role: 'tenant_admin',
      is_active: true,
      metadata: {
        ...metadata,
        created_via: 'tenant_creation',
        auto_assigned: true,
        created_at: new Date().toISOString()
      },
      operation: 'insert'
    });
  }

  /**
   * Check comprehensive user-tenant status
   */
  static async checkUserTenantStatus(
    email: string,
    tenantId: string
  ): Promise<UserTenantStatus> {
    try {
      // Check auth.users table
      const { data: authUser, error: authError } = await supabase.rpc('get_user_by_email', {
        user_email: email
      });

      if (authError) {
        console.error('Error checking auth user:', authError);
      }

      // Check user_tenants table if user exists
      let tenantRelationship = null;
      if (authUser && authUser.length > 0) {
        const { data: relationship, error: relationshipError } = await supabase
          .from('user_tenants')
          .select('*')
          .eq('user_id', authUser[0].id)
          .eq('tenant_id', tenantId)
          .single();

        if (!relationshipError) {
          tenantRelationship = relationship;
        }
      }

      const expectedRole = 'tenant_admin';
      const authExists = authUser && authUser.length > 0;
      const tenantRelationshipExists = !!tenantRelationship;
      const roleMatches = tenantRelationship?.role === expectedRole;

      const issues = [];
      if (!authExists) issues.push('User not found in authentication system');
      if (authExists && !tenantRelationshipExists) issues.push('User-tenant relationship missing');
      if (tenantRelationshipExists && !roleMatches) {
        issues.push(`Role mismatch: expected ${expectedRole}, found ${tenantRelationship.role}`);
      }

      return {
        authExists,
        tenantRelationshipExists,
        roleMatches,
        currentRole: tenantRelationship?.role,
        expectedRole,
        userId: authUser?.[0]?.id,
        issues
      };
    } catch (error) {
      console.error('Error checking user-tenant status:', error);
      return {
        authExists: false,
        tenantRelationshipExists: false,
        roleMatches: false,
        expectedRole: 'tenant_admin',
        issues: ['Error checking status']
      };
    }
  }

  /**
   * Ensure user-tenant record exists with correct role
   */
  static async ensureUserTenantRecord(
    userId: string,
    tenantId: string
  ): Promise<UserTenantResponse> {
    return this.manageUserTenantRelationship({
      user_id: userId,
      tenant_id: tenantId,
      role: 'tenant_admin',
      is_active: true,
      metadata: {
        created_via: 'manual_fix',
        fixed_at: new Date().toISOString()
      },
      operation: 'upsert'
    });
  }

  /**
   * Get user-tenant relationships
   */
  static async getUserTenantRelationships(
    userId?: string,
    tenantId?: string,
    includeInactive = false
  ): Promise<UserTenantResponse> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);
      if (tenantId) params.append('tenant_id', tenantId);
      if (includeInactive) params.append('include_inactive', 'true');

      const { data, error } = await supabase.functions.invoke('manage-user-tenant', {
        method: 'GET',
        headers: {
          'x-request-id': `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }
      });

      if (error) {
        console.error('UserTenantService: Error fetching relationships:', error);
        return {
          success: false,
          error: error.message || 'Failed to fetch user-tenant relationships',
          code: 'FETCH_ERROR'
        };
      }

      return data as UserTenantResponse;

    } catch (error: any) {
      console.error('UserTenantService: Unexpected error fetching relationships:', error);
      return {
        success: false,
        error: error.message || 'Unexpected error occurred',
        code: 'UNEXPECTED_ERROR'
      };
    }
  }
}
