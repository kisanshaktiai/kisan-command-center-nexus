
import { supabase } from '@/integrations/supabase/client';

export interface UserTenantStatus {
  authExists: boolean;
  tenantRelationshipExists: boolean;
  roleMatches: boolean;
  expectedRole: string;
  currentRole?: string;
  userId?: string;
  issues: string[];
}

interface RPCResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export class UserTenantService {
  static async checkUserTenantStatus(email: string, tenantId: string): Promise<UserTenantStatus> {
    console.log('UserTenantService: Checking comprehensive status for:', { email, tenantId });

    const issues: string[] = [];
    let authExists = false;
    let tenantRelationshipExists = false;
    let roleMatches = false;
    let currentRole: string | undefined;
    let userId: string | undefined;
    const expectedRole = 'tenant_admin';

    try {
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        issues.push('Current user not authenticated');
        return {
          authExists: false,
          tenantRelationshipExists: false,
          roleMatches: false,
          expectedRole,
          issues,
          userId
        };
      }

      // Set the user ID from the authenticated user
      userId = user.id;
      authExists = true;

      // Check if the current user is a super admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      const isSuperAdmin = !adminError && adminUser?.role === 'super_admin' && adminUser?.is_active;

      if (isSuperAdmin) {
        // Super admins can access any tenant, check if relationship exists
        const { data: relationship, error: relationshipError } = await supabase
          .from('user_tenants')
          .select('role, is_active')
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId)
          .single();

        if (relationshipError && relationshipError.code === 'PGRST116') {
          // No relationship exists
          tenantRelationshipExists = false;
          issues.push('User-tenant relationship missing');
        } else if (relationshipError) {
          issues.push(`Error checking relationship: ${relationshipError.message}`);
        } else {
          tenantRelationshipExists = relationship?.is_active || false;
          currentRole = relationship?.role;
          roleMatches = relationship?.role === expectedRole || relationship?.role === 'tenant_owner';
          
          if (!relationship?.is_active) {
            issues.push('User-tenant relationship is inactive');
          }
          if (!roleMatches) {
            issues.push(`Role mismatch: expected ${expectedRole}, got ${relationship?.role}`);
          }
        }
      } else {
        // For non-super admins, check if they have the right email for user-tenant operations
        // This is more complex as we need to validate based on the target email vs current user
        if (user.email !== email) {
          issues.push('Cannot manage user-tenant relationship for different email address');
          authExists = false;
        } else {
          // Check their existing relationship with this tenant
          const { data: relationship, error: relationshipError } = await supabase
            .from('user_tenants')
            .select('role, is_active')
            .eq('user_id', user.id)
            .eq('tenant_id', tenantId)
            .single();

          if (relationshipError && relationshipError.code === 'PGRST116') {
            tenantRelationshipExists = false;
            issues.push('User-tenant relationship missing');
          } else if (relationshipError) {
            issues.push(`Error checking relationship: ${relationshipError.message}`);
          } else {
            tenantRelationshipExists = relationship?.is_active || false;
            currentRole = relationship?.role;
            roleMatches = relationship?.role === expectedRole || relationship?.role === 'tenant_owner';
            
            if (!relationship?.is_active) {
              issues.push('User-tenant relationship is inactive');
            }
            if (!roleMatches) {
              issues.push(`Role mismatch: expected ${expectedRole}, got ${relationship?.role}`);
            }
          }
        }
      }

    } catch (error) {
      console.error('UserTenantService: Error checking user-tenant status:', error);
      issues.push(`Error checking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      authExists = false;
    }

    return {
      authExists,
      tenantRelationshipExists,
      roleMatches,
      expectedRole,
      currentRole,
      userId,
      issues
    };
  }

  static async createUserTenantRelationship(userId: string, tenantId: string, role: 'tenant_admin' | 'tenant_owner' = 'tenant_admin'): Promise<boolean> {
    try {
      console.log('UserTenantService: Creating user-tenant relationship:', { userId, tenantId, role });

      // Use the manage_user_tenant_relationship function which handles the logic properly
      const { data, error } = await supabase.rpc('manage_user_tenant_relationship', {
        p_user_id: userId,
        p_tenant_id: tenantId,
        p_role: role,
        p_is_active: true,
        p_metadata: {
          created_via: 'user_tenant_service',
          created_at: new Date().toISOString()
        },
        p_operation: 'upsert'
      });

      if (error) {
        console.error('UserTenantService: Error creating relationship:', error);
        return false;
      }

      const result = data as RPCResponse;
      if (result?.success) {
        console.log('UserTenantService: Relationship created successfully:', data);
        return true;
      } else {
        console.error('UserTenantService: Function returned failure:', data);
        return false;
      }
    } catch (error) {
      console.error('UserTenantService: Unexpected error creating relationship:', error);
      return false;
    }
  }
}
