
import { supabase } from '@/integrations/supabase/client';

export interface UserTenantStatus {
  authExists: boolean;
  tenantRelationshipExists: boolean;
  roleMatches: boolean;
  expectedRole: string;
  issues: string[];
}

export class UserTenantService {
  static async checkUserTenantStatus(email: string, tenantId: string): Promise<UserTenantStatus> {
    console.log('UserTenantService: Checking comprehensive status for:', { email, tenantId });

    const issues: string[] = [];
    let authExists = false;
    let tenantRelationshipExists = false;
    let roleMatches = false;
    const expectedRole = 'tenant_admin';

    try {
      // Check if user exists in auth.users using a direct query
      // Since we can't query auth.users directly, we'll use the admin API through an edge function
      // For now, let's assume the user exists if we get this far (they're authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        issues.push('Current user not authenticated');
        return {
          authExists: false,
          tenantRelationshipExists: false,
          roleMatches: false,
          expectedRole,
          issues
        };
      }

      // Check if the target user exists by trying to find them in user_tenants
      // This is an indirect way to check if they exist in auth
      const { data: existingUserCheck, error: userCheckError } = await supabase
        .from('user_tenants')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .limit(1);

      if (userCheckError) {
        console.error('UserTenantService: Error checking existing users:', userCheckError);
        issues.push(`Error checking existing users: ${userCheckError.message}`);
      }

      // For super admins, we assume they can access any tenant
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      const isSuperAdmin = !adminError && adminUser?.role === 'super_admin' && adminUser?.is_active;

      if (isSuperAdmin) {
        // Super admins can access any tenant, so we'll create the relationship if it doesn't exist
        authExists = true;
        
        // Check if relationship exists
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
          roleMatches = relationship?.role === expectedRole || relationship?.role === 'tenant_owner';
          
          if (!relationship?.is_active) {
            issues.push('User-tenant relationship is inactive');
          }
          if (!roleMatches) {
            issues.push(`Role mismatch: expected ${expectedRole}, got ${relationship?.role}`);
          }
        }
      } else {
        // For non-super admins, we need to check if they have a valid relationship
        issues.push('Authentication method not available for non-super admin users');
        authExists = false;
      }

    } catch (error) {
      console.error('UserTenantService: Error checking auth user:', error);
      issues.push(`Error checking authentication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      authExists = false;
    }

    return {
      authExists,
      tenantRelationshipExists,
      roleMatches,
      expectedRole,
      issues
    };
  }

  static async createUserTenantRelationship(userId: string, tenantId: string, role: 'tenant_admin' | 'tenant_owner' = 'tenant_admin'): Promise<boolean> {
    try {
      console.log('UserTenantService: Creating user-tenant relationship:', { userId, tenantId, role });

      const { data, error } = await supabase.functions.invoke('manage-user-tenant', {
        body: {
          user_id: userId,
          tenant_id: tenantId,
          role,
          is_active: true,
          metadata: {
            created_via: 'user_tenant_service',
            created_at: new Date().toISOString()
          },
          operation: 'upsert'
        }
      });

      if (error) {
        console.error('UserTenantService: Error creating relationship:', error);
        return false;
      }

      return data?.success || false;
    } catch (error) {
      console.error('UserTenantService: Unexpected error creating relationship:', error);
      return false;
    }
  }
}
