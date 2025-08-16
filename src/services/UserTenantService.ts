
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
  relationshipId?: string;
  isActive?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at?: string;
}

export interface TenantRelationshipStatus {
  hasRelationship: boolean;
  isValid: boolean;
  relationship?: any;
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
   * Enhanced method to check and ensure tenant relationship
   * This prioritizes user_tenants table checking first
   */
  static async checkAndEnsureTenantRelationship(
    email: string,
    tenantId: string
  ): Promise<TenantRelationshipStatus> {
    try {
      console.log('UserTenantService: Checking and ensuring tenant relationship for:', email, tenantId);

      // Step 1: First get user ID from auth.users via edge function
      const { data: authResponse, error: authError } = await supabase.functions.invoke('get-user-by-email', {
        body: { user_email: email }
      });

      if (authError) {
        console.error('Error checking auth user:', authError);
        return {
          hasRelationship: false,
          isValid: false,
          issues: ['Failed to check user authentication status']
        };
      }

      const authUsers = authResponse as AuthUser[];
      const authUser = authUsers && authUsers.length > 0 ? authUsers[0] : null;

      if (!authUser) {
        return {
          hasRelationship: false,
          isValid: false,
          issues: ['User not found in authentication system']
        };
      }

      // Step 2: Check if user_tenants relationship exists
      const { data: existingRelationship, error: relationshipError } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('tenant_id', tenantId)
        .single();

      if (relationshipError && relationshipError.code !== 'PGRST116') {
        console.error('Error checking user_tenants relationship:', relationshipError);
        return {
          hasRelationship: false,
          isValid: false,
          userId: authUser.id,
          issues: ['Error checking tenant relationship']
        };
      }

      // Step 3: If relationship exists, validate it
      if (existingRelationship) {
        const isValid = existingRelationship.role === 'tenant_admin' && existingRelationship.is_active;
        const issues = [];

        if (existingRelationship.role !== 'tenant_admin') {
          issues.push(`Incorrect role: expected tenant_admin, found ${existingRelationship.role}`);
        }
        if (!existingRelationship.is_active) {
          issues.push('Relationship is inactive');
        }

        return {
          hasRelationship: true,
          isValid,
          relationship: existingRelationship,
          userId: authUser.id,
          issues
        };
      }

      // Step 4: If no relationship exists, create one
      console.log('UserTenantService: Creating missing tenant relationship for user:', authUser.id);
      
      const createResult = await this.manageUserTenantRelationship({
        user_id: authUser.id,
        tenant_id: tenantId,
        role: 'tenant_admin',
        is_active: true,
        metadata: {
          created_via: 'auto_ensure',
          auto_created: true,
          created_at: new Date().toISOString()
        },
        operation: 'insert'
      });

      if (createResult.success) {
        return {
          hasRelationship: true,
          isValid: true,
          userId: authUser.id,
          issues: []
        };
      } else {
        return {
          hasRelationship: false,
          isValid: false,
          userId: authUser.id,
          issues: [createResult.error || 'Failed to create tenant relationship']
        };
      }

    } catch (error: any) {
      console.error('UserTenantService: Error in checkAndEnsureTenantRelationship:', error);
      return {
        hasRelationship: false,
        isValid: false,
        issues: ['Unexpected error occurred while checking tenant relationship']
      };
    }
  }

  /**
   * Check comprehensive user-tenant status (legacy method, now uses enhanced logic)
   */
  static async checkUserTenantStatus(
    email: string,
    tenantId: string
  ): Promise<UserTenantStatus> {
    try {
      // Use the enhanced method for primary checking
      const relationshipStatus = await this.checkAndEnsureTenantRelationship(email, tenantId);

      // Convert to legacy format for backward compatibility
      return {
        authExists: !!relationshipStatus.userId,
        tenantRelationshipExists: relationshipStatus.hasRelationship,
        roleMatches: relationshipStatus.isValid,
        currentRole: relationshipStatus.relationship?.role,
        expectedRole: 'tenant_admin',
        userId: relationshipStatus.userId,
        relationshipId: relationshipStatus.relationship?.id,
        isActive: relationshipStatus.relationship?.is_active,
        issues: relationshipStatus.issues
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
