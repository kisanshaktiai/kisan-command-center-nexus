
// Focused user-tenant services
export { UserAuthService } from './UserAuthService';
export { TenantRelationshipService } from './TenantRelationshipService';
export { UserTenantStatusService } from './UserTenantStatusService';

// Re-export types for backward compatibility
export type { UserAuthStatus } from './UserAuthService';
export type { 
  TenantRelationshipStatus, 
  ManageRelationshipRequest, 
  RelationshipResponse 
} from './TenantRelationshipService';
export type { UserTenantStatus } from './UserTenantStatusService';

// Import supabase client
import { supabase } from '@/integrations/supabase/client';

// Backward compatibility - create a facade that maintains the original API
import { UserTenantStatusService } from './UserTenantStatusService';
import { TenantRelationshipService } from './TenantRelationshipService';
import type { ManageRelationshipRequest, RelationshipResponse } from './TenantRelationshipService';

export class UserTenantService {
  static async manageUserTenantRelationship(
    request: ManageRelationshipRequest
  ): Promise<RelationshipResponse> {
    return TenantRelationshipService.manageRelationship(request);
  }

  static async createTenantAdminRelationship(
    userId: string,
    tenantId: string,
    metadata?: Record<string, any>
  ): Promise<RelationshipResponse> {
    return TenantRelationshipService.createTenantAdminRelationship(userId, tenantId, metadata);
  }

  static async checkUserTenantStatus(email: string, tenantId: string) {
    return UserTenantStatusService.checkComprehensiveStatus(email, tenantId);
  }

  static async ensureUserTenantRecord(userId: string, tenantId: string): Promise<RelationshipResponse> {
    return TenantRelationshipService.ensureUserTenantRecord(userId, tenantId);
  }

  static async getUserTenantRelationships(
    userId?: string,
    tenantId?: string,
    includeInactive = false
  ): Promise<RelationshipResponse> {
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

      return data as RelationshipResponse;
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
