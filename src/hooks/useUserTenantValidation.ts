
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserTenantValidationStatus {
  userExistsInAuth: boolean;
  userTenantRelationshipExists: boolean;
  userRole: string | null;
  isValid: boolean;
  canAutoFix: boolean;
  issues: string[];
  userId?: string;
}

export interface UserTenantValidationResult {
  [tenantId: string]: UserTenantValidationStatus;
}

export const useUserTenantValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [isCreatingRelationship, setIsCreatingRelationship] = useState(false);

  const validateUserTenantAccess = useCallback(async (
    tenantId: string,
    userEmail?: string
  ): Promise<UserTenantValidationStatus> => {
    try {
      console.log('Validating user-tenant access for:', { tenantId, userEmail });

      // Get current user info
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          userExistsInAuth: false,
          userTenantRelationshipExists: false,
          userRole: null,
          isValid: false,
          canAutoFix: false,
          issues: ['User not authenticated']
        };
      }

      // Check if user is super admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      const isSuperAdmin = !adminError && adminUser?.role === 'super_admin' && adminUser?.is_active;

      // Check user-tenant relationship
      const { data: userTenant, error: relationshipError } = await supabase
        .from('user_tenants')
        .select('role, is_active, created_at')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .single();

      const issues: string[] = [];
      let canAutoFix = false;

      if (relationshipError && relationshipError.code === 'PGRST116') {
        // No relationship exists
        issues.push('User-tenant relationship missing');
        canAutoFix = isSuperAdmin; // Super admins can auto-create relationships
      } else if (relationshipError) {
        issues.push(`Error checking relationship: ${relationshipError.message}`);
      } else if (userTenant && !userTenant.is_active) {
        issues.push('User-tenant relationship is inactive');
        canAutoFix = isSuperAdmin;
      }

      const userTenantRelationshipExists = !relationshipError && userTenant?.is_active;
      const isValid = userTenantRelationshipExists || isSuperAdmin;

      return {
        userExistsInAuth: true,
        userTenantRelationshipExists,
        userRole: userTenant?.role || (isSuperAdmin ? 'super_admin' : null),
        isValid,
        canAutoFix,
        issues,
        userId: user.id
      };
    } catch (error) {
      console.error('Error validating user-tenant access:', error);
      return {
        userExistsInAuth: false,
        userTenantRelationshipExists: false,
        userRole: null,
        isValid: false,
        canAutoFix: false,
        issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }, []);

  const createUserTenantRelationship = useCallback(async (
    tenantId: string,
    role: 'tenant_admin' | 'tenant_user' = 'tenant_admin'
  ): Promise<boolean> => {
    setIsCreatingRelationship(true);
    try {
      console.log('Creating user-tenant relationship:', { tenantId, role });

      const { data, error } = await supabase.functions.invoke('manage-user-tenant', {
        body: {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          tenant_id: tenantId,
          role,
          is_active: true,
          metadata: {
            created_via: 'auto_validation',
            created_at: new Date().toISOString()
          },
          operation: 'upsert'
        }
      });

      if (error) {
        console.error('Error creating user-tenant relationship:', error);
        toast.error('Failed to create user-tenant relationship');
        return false;
      }

      if (data?.success) {
        toast.success('User-tenant relationship created successfully');
        return true;
      } else {
        toast.error(data?.error || 'Failed to create user-tenant relationship');
        return false;
      }
    } catch (error) {
      console.error('Unexpected error creating relationship:', error);
      toast.error('Network error occurred while creating relationship');
      return false;
    } finally {
      setIsCreatingRelationship(false);
    }
  }, []);

  const validateMultipleTenants = useCallback(async (
    tenantIds: string[]
  ): Promise<UserTenantValidationResult> => {
    setIsValidating(true);
    try {
      const results: UserTenantValidationResult = {};
      
      // Validate each tenant in parallel
      const validations = await Promise.allSettled(
        tenantIds.map(async (tenantId) => {
          const result = await validateUserTenantAccess(tenantId);
          return { tenantId, result };
        })
      );

      validations.forEach((validation) => {
        if (validation.status === 'fulfilled') {
          results[validation.value.tenantId] = validation.value.result;
        } else {
          results[validation.value || 'unknown'] = {
            userExistsInAuth: false,
            userTenantRelationshipExists: false,
            userRole: null,
            isValid: false,
            canAutoFix: false,
            issues: ['Validation failed']
          };
        }
      });

      return results;
    } catch (error) {
      console.error('Error validating multiple tenants:', error);
      return {};
    } finally {
      setIsValidating(false);
    }
  }, [validateUserTenantAccess]);

  return {
    validateUserTenantAccess,
    createUserTenantRelationship,
    validateMultipleTenants,
    isValidating,
    isCreatingRelationship
  };
};
