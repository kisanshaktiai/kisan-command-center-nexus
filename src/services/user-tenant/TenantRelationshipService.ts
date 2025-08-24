
import { supabase } from '@/integrations/supabase/client';

export interface TenantRelationshipStatus {
  relationshipExists: boolean;
  roleMatches: boolean;
  currentRole?: string;
  expectedRole: string;
  issues: string[];
}

export interface ManageRelationshipRequest {
  user_id: string;
  tenant_id: string;
  role: 'super_admin' | 'platform_admin' | 'tenant_admin' | 'tenant_user' | 'farmer' | 'dealer';
  is_active?: boolean;
  metadata?: Record<string, any>;
  operation?: 'insert' | 'update' | 'upsert';
}

export interface RelationshipResponse {
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

/**
 * Handles tenant relationship management
 */
export class TenantRelationshipService {
  /**
   * Check tenant relationship status for a user
   */
  static async checkTenantRelationship(
    userId: string, 
    tenantId: string
  ): Promise<TenantRelationshipStatus> {
    try {
      console.log('TenantRelationshipService: Checking relationship for:', { userId, tenantId });

      if (!userId || !tenantId) {
        return {
          relationshipExists: false,
          roleMatches: false,
          expectedRole: 'tenant_admin',
          issues: ['User ID and Tenant ID are required']
        };
      }
      
      const { data: relationship, error: relationshipError } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (relationshipError && relationshipError.code !== 'PGRST116') {
        console.error('TenantRelationshipService: Error checking relationship:', relationshipError);
        return {
          relationshipExists: false,
          roleMatches: false,
          expectedRole: 'tenant_admin',
          issues: [`Error checking tenant relationship: ${relationshipError.message}`]
        };
      }

      const expectedRole = 'tenant_admin';
      const relationshipExists = !!relationship;
      const roleMatches = relationship?.role === expectedRole;

      const issues = [];
      if (!relationshipExists) {
        issues.push('User-tenant relationship missing');
      }
      if (relationshipExists && !roleMatches) {
        issues.push(`Role mismatch: expected ${expectedRole}, found ${relationship.role}`);
      }

      return {
        relationshipExists,
        roleMatches,
        currentRole: relationship?.role,
        expectedRole,
        issues
      };
    } catch (error) {
      console.error('TenantRelationshipService: Error checking relationship:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        relationshipExists: false,
        roleMatches: false,
        expectedRole: 'tenant_admin',
        issues: [`Error checking relationship: ${errorMessage}`]
      };
    }
  }

  /**
   * Manage user-tenant relationship via global edge function
   */
  static async manageRelationship(
    request: ManageRelationshipRequest
  ): Promise<RelationshipResponse> {
    try {
      console.log('TenantRelationshipService: Managing relationship via global function:', request);

      const { data, error } = await supabase.functions.invoke('manage-user-tenant', {
        body: request,
        headers: {
          'x-request-id': `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          'x-correlation-id': `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }
      });

      if (error) {
        console.error('TenantRelationshipService: Edge function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to manage user-tenant relationship',
          code: 'EDGE_FUNCTION_ERROR'
        };
      }

      console.log('TenantRelationshipService: Successfully managed relationship:', data);
      return data as RelationshipResponse;

    } catch (error: any) {
      console.error('TenantRelationshipService: Unexpected error:', error);
      return {
        success: false,
        error: error.message || 'Unexpected error occurred',
        code: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * Create a tenant admin relationship
   */
  static async createTenantAdminRelationship(
    userId: string,
    tenantId: string,
    metadata?: Record<string, any>
  ): Promise<RelationshipResponse> {
    return this.manageRelationship({
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
   * Ensure user-tenant record exists with correct role
   */
  static async ensureUserTenantRecord(
    userId: string,
    tenantId: string
  ): Promise<RelationshipResponse> {
    console.log('TenantRelationshipService: Ensuring user-tenant record for:', { userId, tenantId });
    
    return this.manageRelationship({
      user_id: userId,
      tenant_id: tenantId,
      role: 'tenant_admin',
      is_active: true,
      metadata: {
        created_via: 'manual_fix',
        fixed_at: new Date().toISOString(),
        source: 'tenant_user_creator'
      },
      operation: 'upsert'
    });
  }
}
