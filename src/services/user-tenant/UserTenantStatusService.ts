
import { UserAuthService, UserAuthStatus } from './UserAuthService';
import { TenantRelationshipService, TenantRelationshipStatus } from './TenantRelationshipService';

export interface UserTenantStatus {
  authExists: boolean;
  tenantRelationshipExists: boolean;
  roleMatches: boolean;
  currentRole?: string;
  expectedRole: string;
  userId?: string;
  issues: string[];
}

/**
 * Comprehensive user-tenant status checking service
 */
export class UserTenantStatusService {
  /**
   * Check comprehensive user-tenant status across auth and tenant relationships
   */
  static async checkComprehensiveStatus(
    email: string,
    tenantId: string
  ): Promise<UserTenantStatus> {
    try {
      console.log('UserTenantStatusService: Checking comprehensive status for:', { email, tenantId });

      if (!email || !email.trim()) {
        return {
          authExists: false,
          tenantRelationshipExists: false,
          roleMatches: false,
          expectedRole: 'tenant_admin',
          issues: ['Email is required']
        };
      }

      if (!tenantId || !tenantId.trim()) {
        return {
          authExists: false,
          tenantRelationshipExists: false,
          roleMatches: false,
          expectedRole: 'tenant_admin',
          issues: ['Tenant ID is required']
        };
      }

      // Check user authentication status
      const authStatus: UserAuthStatus = await UserAuthService.checkUserAuth(email);
      
      let relationshipStatus: TenantRelationshipStatus = {
        relationshipExists: false,
        roleMatches: false,
        expectedRole: 'tenant_admin',
        issues: []
      };

      // Check tenant relationship if user exists
      if (authStatus.authExists && authStatus.userId) {
        relationshipStatus = await TenantRelationshipService.checkTenantRelationship(
          authStatus.userId, 
          tenantId
        );
      }

      // Combine all issues
      const allIssues = [...authStatus.issues, ...relationshipStatus.issues];

      const result: UserTenantStatus = {
        authExists: authStatus.authExists,
        tenantRelationshipExists: relationshipStatus.relationshipExists,
        roleMatches: relationshipStatus.roleMatches,
        currentRole: relationshipStatus.currentRole,
        expectedRole: relationshipStatus.expectedRole,
        userId: authStatus.userId,
        issues: allIssues
      };

      console.log('UserTenantStatusService: Comprehensive status result:', result);
      return result;
    } catch (error) {
      console.error('UserTenantStatusService: Error checking comprehensive status:', error);
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
}
