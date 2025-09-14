
import { UserAuthService } from './UserAuthService';
import { TenantRelationshipService } from './TenantRelationshipService';
import { UserTenantStatusService } from './UserTenantStatusService';
import type { UserTenantStatus } from './UserTenantStatusService';

export interface SyncResult {
  success: boolean;
  status: UserTenantStatus | null;
  created: boolean;
  error?: string;
}

/**
 * Service for synchronizing user-tenant relationships
 */
export class UserTenantSyncService {
  /**
   * Comprehensive sync that checks and creates relationships as needed
   */
  static async syncUserTenantRelationship(
    email: string,
    tenantId: string,
    autoCreate: boolean = true
  ): Promise<SyncResult> {
    try {
      console.log('UserTenantSyncService: Starting sync for:', { email, tenantId, autoCreate });

      // Step 1: Check comprehensive status
      const status = await UserTenantStatusService.checkComprehensiveStatus(email, tenantId);
      console.log('UserTenantSyncService: Initial status:', status);

      // If everything is fine, return success
      if (status.authExists && status.tenantRelationshipExists && status.roleMatches) {
        return {
          success: true,
          status,
          created: false
        };
      }

      // If user doesn't exist in auth, we can't proceed
      if (!status.authExists) {
        return {
          success: false,
          status,
          created: false,
          error: 'User not found in authentication system'
        };
      }

      // If relationship is missing and we should auto-create
      if (autoCreate && status.userId && !status.tenantRelationshipExists) {
        console.log('UserTenantSyncService: Creating missing relationship');
        
        const relationshipResult = await TenantRelationshipService.ensureUserTenantRecord(
          status.userId,
          tenantId
        );

        if (!relationshipResult.success) {
          return {
            success: false,
            status,
            created: false,
            error: relationshipResult.error || 'Failed to create user-tenant relationship'
          };
        }

        // Re-check status after creation
        const updatedStatus = await UserTenantStatusService.checkComprehensiveStatus(email, tenantId);
        console.log('UserTenantSyncService: Updated status after creation:', updatedStatus);

        return {
          success: updatedStatus.authExists && updatedStatus.tenantRelationshipExists,
          status: updatedStatus,
          created: true
        };
      }

      // If role doesn't match, return the status for manual handling
      if (status.tenantRelationshipExists && !status.roleMatches) {
        return {
          success: false,
          status,
          created: false,
          error: `Role mismatch: expected ${status.expectedRole}, found ${status.currentRole}`
        };
      }

      return {
        success: false,
        status,
        created: false,
        error: 'Unable to sync user-tenant relationship'
      };

    } catch (error) {
      console.error('UserTenantSyncService: Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        status: null,
        created: false,
        error: errorMessage
      };
    }
  }

  /**
   * Batch sync multiple users for a tenant
   */
  static async batchSyncUsersForTenant(
    userEmails: string[],
    tenantId: string,
    autoCreate: boolean = true
  ): Promise<{ email: string; result: SyncResult }[]> {
    console.log('UserTenantSyncService: Batch syncing users:', { userEmails, tenantId });

    const results = await Promise.all(
      userEmails.map(async (email) => ({
        email,
        result: await this.syncUserTenantRelationship(email, tenantId, autoCreate)
      }))
    );

    return results;
  }
}
