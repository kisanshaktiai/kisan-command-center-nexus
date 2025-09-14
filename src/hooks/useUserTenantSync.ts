
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { UserTenantStatusService } from '@/services/user-tenant/UserTenantStatusService';
import { TenantRelationshipService } from '@/services/user-tenant/TenantRelationshipService';
import type { UserTenantStatus } from '@/services/user-tenant/UserTenantStatusService';

interface UserTenantSyncState {
  isChecking: boolean;
  isCreating: boolean;
  status: UserTenantStatus | null;
  error: string | null;
  lastChecked: Date | null;
}

export const useUserTenantSync = (tenantId?: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<UserTenantSyncState>({
    isChecking: false,
    isCreating: false,
    status: null,
    error: null,
    lastChecked: null,
  });

  const checkAndSyncUserTenant = useCallback(async (email: string, targetTenantId: string) => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      console.log('useUserTenantSync: Checking comprehensive status for:', { email, targetTenantId });
      
      // Check comprehensive status first
      const status = await UserTenantStatusService.checkComprehensiveStatus(email, targetTenantId);
      
      setState(prev => ({ 
        ...prev, 
        status, 
        lastChecked: new Date(),
        isChecking: false 
      }));

      console.log('useUserTenantSync: Status result:', status);

      // If user exists but relationship is missing, create it
      if (status.authExists && status.userId && !status.tenantRelationshipExists) {
        console.log('useUserTenantSync: Creating missing user-tenant relationship');
        
        setState(prev => ({ ...prev, isCreating: true }));
        
        try {
          const relationshipResult = await TenantRelationshipService.ensureUserTenantRecord(
            status.userId,
            targetTenantId
          );
          
          if (relationshipResult.success) {
            console.log('useUserTenantSync: Successfully created user-tenant relationship');
            
            // Re-check status after creation
            const updatedStatus = await UserTenantStatusService.checkComprehensiveStatus(email, targetTenantId);
            setState(prev => ({ 
              ...prev, 
              status: updatedStatus, 
              isCreating: false,
              lastChecked: new Date()
            }));
          } else {
            console.error('useUserTenantSync: Failed to create relationship:', relationshipResult.error);
            setState(prev => ({ 
              ...prev, 
              error: relationshipResult.error || 'Failed to create user-tenant relationship',
              isCreating: false
            }));
          }
        } catch (relationshipError) {
          console.error('useUserTenantSync: Error creating relationship:', relationshipError);
          setState(prev => ({ 
            ...prev, 
            error: relationshipError instanceof Error ? relationshipError.message : 'Unknown error creating relationship',
            isCreating: false
          }));
        }
      }
      
      return status;
    } catch (error) {
      console.error('useUserTenantSync: Error checking status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isChecking: false,
        isCreating: false
      }));
      return null;
    }
  }, []);

  const syncCurrentUser = useCallback(async () => {
    if (!user?.email || !tenantId) {
      console.log('useUserTenantSync: Missing user email or tenant ID');
      return null;
    }
    
    return checkAndSyncUserTenant(user.email, tenantId);
  }, [user?.email, tenantId, checkAndSyncUserTenant]);

  const manualSync = useCallback(async (email: string, targetTenantId: string) => {
    return checkAndSyncUserTenant(email, targetTenantId);
  }, [checkAndSyncUserTenant]);

  // Auto-sync on user/tenant changes
  useEffect(() => {
    if (user?.email && tenantId && !state.isChecking && !state.isCreating) {
      console.log('useUserTenantSync: Auto-syncing for user:', user.email, 'tenant:', tenantId);
      syncCurrentUser();
    }
  }, [user?.email, tenantId, syncCurrentUser, state.isChecking, state.isCreating]);

  return {
    ...state,
    syncCurrentUser,
    manualSync,
    isReady: !state.isChecking && !state.isCreating,
    hasValidRelationship: state.status?.authExists && state.status?.tenantRelationshipExists && state.status?.roleMatches,
  };
};
