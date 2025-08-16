
import { supabase } from '@/integrations/supabase/client';

export interface ManageUserTenantRequest {
  user_id: string;
  tenant_id: string;
  role: 'super_admin' | 'platform_admin' | 'tenant_admin' | 'tenant_owner' | 'tenant_user' | 'farmer' | 'dealer';
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
   * Create a tenant owner relationship when a new tenant is created
   */
  static async createTenantOwnerRelationship(
    userId: string,
    tenantId: string,
    metadata?: Record<string, any>
  ): Promise<UserTenantResponse> {
    return this.manageUserTenantRelationship({
      user_id: userId,
      tenant_id: tenantId,
      role: 'tenant_owner',
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
