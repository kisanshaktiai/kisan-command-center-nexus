
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

      // Check user authentication status with proper error handling
      let authStatus: UserAuthStatus;
      try {
        authStatus = await UserAuthService.checkUserAuth(email);
      } catch (authError) {
        console.error('UserTenantStatusService: Auth check failed:', authError);
        return {
          authExists: false,
          tenantRelationshipExists: false,
          roleMatches: false,
          expectedRole: 'tenant_admin',
          issues: ['Failed to check user authentication status']
        };
      }
      
      let relationshipStatus: TenantRelationshipStatus = {
        relationshipExists: false,
        roleMatches: false,
        expectedRole: 'tenant_admin',
        issues: []
      };

      // Check tenant relationship if user exists
      if (authStatus.authExists && authStatus.userId) {
        try {
          relationshipStatus = await TenantRelationshipService.checkTenantRelationship(
            authStatus.userId, 
            tenantId
          );
        } catch (relationshipError) {
          console.error('UserTenantStatusService: Relationship check failed:', relationshipError);
          relationshipStatus.issues.push('Failed to check tenant relationship');
        }
      } else {
        // If auth doesn't exist, we know relationship won't exist either
        relationshipStatus.issues.push('Cannot check relationship without valid user ID');
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

  /**
   * Get a summary of all issues for a user-tenant relationship
   */
  static async getStatusSummary(email: string, tenantId: string): Promise<{
    isReady: boolean;
    criticalIssues: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const status = await this.checkComprehensiveStatus(email, tenantId);
    
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!status.authExists) {
      criticalIssues.push('User not found in authentication system');
      recommendations.push('Ensure user has signed up and verified their email');
    }

    if (status.authExists && !status.tenantRelationshipExists) {
      warnings.push('User-tenant relationship missing');
      recommendations.push('Create user-tenant relationship with appropriate role');
    }

    if (status.tenantRelationshipExists && !status.roleMatches) {
      warnings.push(`Role mismatch: found ${status.currentRole}, expected ${status.expectedRole}`);
      recommendations.push('Update user role to match tenant requirements');
    }

    // Add any additional issues from the status
    status.issues.forEach(issue => {
      if (!criticalIssues.includes(issue) && !warnings.includes(issue)) {
        warnings.push(issue);
      }
    });

    return {
      isReady: status.authExists && status.tenantRelationshipExists && status.roleMatches,
      criticalIssues,
      warnings,
      recommendations
    };
  }
}
