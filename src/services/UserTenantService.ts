
import { supabase } from '@/integrations/supabase/client';

export interface ManageUserTenantRequest {
  user_id: string;
  tenant_id: string;
  role: 'super_admin' | 'tenant_admin' | 'tenant_owner' | 'farmer' | 'dealer' | 'tenant_manager' | 'agent';
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

// Type guard for database function response
function isUserTenantResponse(data: any): data is UserTenantResponse {
  return data && typeof data === 'object' && 'success' in data;
}

export class UserTenantService {
  /**
   * Create or update a user-tenant relationship using the database function directly
   */
  static async manageUserTenantRelationship(
    request: ManageUserTenantRequest
  ): Promise<UserTenantResponse> {
    try {
      console.log('UserTenantService: Managing user-tenant relationship via database function:', request);

      // Validate role is one of the allowed enum values
      const validRoles = ['super_admin', 'tenant_admin', 'tenant_owner', 'farmer', 'dealer', 'tenant_manager', 'agent'];
      if (!validRoles.includes(request.role)) {
        console.error('UserTenantService: Invalid role provided:', request.role);
        return {
          success: false,
          error: `Invalid role: ${request.role}. Must be one of: ${validRoles.join(', ')}`,
          code: 'INVALID_ROLE'
        };
      }

      // Call the database function directly instead of the edge function
      const { data, error } = await supabase.rpc('manage_user_tenant_relationship', {
        p_user_id: request.user_id,
        p_tenant_id: request.tenant_id,
        p_role: request.role,
        p_is_active: request.is_active ?? true,
        p_metadata: request.metadata || {},
        p_operation: request.operation || 'upsert'
      });

      if (error) {
        console.error('UserTenantService: Database function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to manage user-tenant relationship',
          code: 'DATABASE_FUNCTION_ERROR'
        };
      }

      // Properly handle the database function response with type checking
      if (!data) {
        console.error('UserTenantService: No data returned from database function');
        return {
          success: false,
          error: 'No response from database function',
          code: 'NO_RESPONSE'
        };
      }

      // Type guard and proper casting
      let response: UserTenantResponse;
      if (isUserTenantResponse(data)) {
        response = data;
      } else if (typeof data === 'object' && data !== null) {
        // Handle cases where data might be a plain object
        const dataObj = data as Record<string, any>;
        response = {
          success: dataObj.success || false,
          error: dataObj.error,
          code: dataObj.code,
          relationship_id: dataObj.relationship_id,
          operation: dataObj.operation,
          user_id: dataObj.user_id,
          tenant_id: dataObj.tenant_id,
          role: dataObj.role,
          is_active: dataObj.is_active,
          message: dataObj.message,
          request_id: dataObj.request_id,
          correlation_id: dataObj.correlation_id
        };
      } else {
        console.error('UserTenantService: Invalid response format:', data);
        return {
          success: false,
          error: 'Invalid response format from database function',
          code: 'INVALID_RESPONSE_FORMAT'
        };
      }

      if (!response.success) {
        console.error('UserTenantService: Database function returned error:', response);
        return response;
      }

      console.log('UserTenantService: Successfully managed relationship via database function:', response);
      return response;

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
    console.log('UserTenantService: Creating tenant admin relationship:', { userId, tenantId });
    
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
   * Check comprehensive user-tenant status across both auth.users and user_tenants tables
   */
  static async checkUserTenantStatus(
    email: string,
    tenantId: string
  ): Promise<UserTenantStatus> {
    try {
      console.log('UserTenantService: Checking comprehensive status for:', { email, tenantId });

      if (!email || !email.trim()) {
        console.error('UserTenantService: Email is required');
        return {
          authExists: false,
          tenantRelationshipExists: false,
          roleMatches: false,
          expectedRole: 'tenant_admin',
          issues: ['Email is required']
        };
      }

      if (!tenantId || !tenantId.trim()) {
        console.error('UserTenantService: Tenant ID is required');
        return {
          authExists: false,
          tenantRelationshipExists: false,
          roleMatches: false,
          expectedRole: 'tenant_admin',
          issues: ['Tenant ID is required']
        };
      }

      // Check auth.users table using the get-user-by-email edge function
      const { data: authUserResponse, error: authError } = await supabase.functions.invoke('get-user-by-email', {
        body: { user_email: email.trim() }
      });

      if (authError) {
        console.error('UserTenantService: Error checking auth user:', authError);
        return {
          authExists: false,
          tenantRelationshipExists: false,
          roleMatches: false,
          expectedRole: 'tenant_admin',
          issues: [`Error checking authentication: ${authError.message}`]
        };
      }

      const authUser = authUserResponse && Array.isArray(authUserResponse) && authUserResponse.length > 0 ? authUserResponse[0] : null;
      console.log('UserTenantService: Auth user result:', authUser);

      // Check user_tenants table if user exists
      let tenantRelationship = null;
      if (authUser) {
        console.log('UserTenantService: Checking tenant relationship for user:', authUser.id);
        
        const { data: relationship, error: relationshipError } = await supabase
          .from('user_tenants')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (relationshipError) {
          console.error('UserTenantService: Error checking tenant relationship:', relationshipError);
          return {
            authExists: !!authUser,
            tenantRelationshipExists: false,
            roleMatches: false,
            expectedRole: 'tenant_admin',
            userId: authUser?.id,
            issues: [`Error checking tenant relationship: ${relationshipError.message}`]
          };
        }

        tenantRelationship = relationship;
        console.log('UserTenantService: Found tenant relationship:', tenantRelationship);
      }

      const expectedRole = 'tenant_admin';
      const authExists = !!authUser;
      const tenantRelationshipExists = !!tenantRelationship;
      const roleMatches = tenantRelationship?.role === expectedRole;

      const issues = [];
      if (!authExists) {
        issues.push('User not found in authentication system');
      }
      if (authExists && !tenantRelationshipExists) {
        issues.push('User-tenant relationship missing');
      }
      if (tenantRelationshipExists && !roleMatches) {
        issues.push(`Role mismatch: expected ${expectedRole}, found ${tenantRelationship.role}`);
      }

      const result = {
        authExists,
        tenantRelationshipExists,
        roleMatches,
        currentRole: tenantRelationship?.role,
        expectedRole,
        userId: authUser?.id,
        issues
      };

      console.log('UserTenantService: Final status result:', result);
      return result;
    } catch (error) {
      console.error('UserTenantService: Error checking user-tenant status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        authExists: false,
        tenantRelationshipExists: false,
        roleMatches: false,
        expectedRole: 'tenant_admin',
        issues: [`Error checking status: ${errorMessage}`]
      };
    }
  }

  /**
   * Ensure user-tenant record exists with correct role using global function
   * This will create the relationship if user exists but relationship is missing
   */
  static async ensureUserTenantRecord(
    userId: string,
    tenantId: string
  ): Promise<UserTenantResponse> {
    console.log('UserTenantService: Ensuring user-tenant record via global function for:', { userId, tenantId });
    
    return this.manageUserTenantRelationship({
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
