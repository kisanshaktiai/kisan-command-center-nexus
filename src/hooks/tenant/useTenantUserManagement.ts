
import { useState, useCallback, useRef } from 'react';
import { useTenantUserManagement as useUserManagement } from '@/hooks/useTenantUserManagement';
import { UserTenantStatus } from '@/services/UserTenantService';
import { useToast } from '@/hooks/use-toast';

interface UserInfo {
  email: string;
  userId: string;
  created_at: string;
  isAdmin: boolean;
  userStatus: string;
}

export const useTenantUserManagement = () => {
  const [userStatus, setUserStatus] = useState<'checking' | 'found' | 'not_found' | 'error'>('checking');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [tenantStatus, setTenantStatus] = useState<UserTenantStatus | null>(null);
  const { toast } = useToast();
  
  // Use refs to prevent infinite loops
  const isCheckingRef = useRef(false);
  const lastCheckedRef = useRef<string>('');
  
  const {
    isCheckingUser,
    isCreatingUser,
    isSendingReset,
    isCheckingStatus,
    isFixingRelationship,
    checkUserExists,
    checkUserTenantStatus,
    ensureUserTenantRecord,
    createAdminUser,
    sendPasswordReset
  } = useUserManagement();

  const checkUser = useCallback(async (tenantOwnerEmail: string, tenantId: string) => {
    if (!tenantOwnerEmail || !tenantId) {
      setUserStatus('error');
      return;
    }

    // Prevent duplicate calls
    const checkKey = `${tenantOwnerEmail}-${tenantId}`;
    if (isCheckingRef.current || lastCheckedRef.current === checkKey) {
      return;
    }

    isCheckingRef.current = true;
    lastCheckedRef.current = checkKey;
    
    setUserStatus('checking');
    setUserInfo(null);
    setTenantStatus(null);
    
    try {
      console.log('useTenantUserManagement: Checking user exists for:', tenantOwnerEmail);
      const result = await checkUserExists(tenantOwnerEmail);
      
      if (result?.error) {
        console.error('useTenantUserManagement: Error checking user:', result.error);
        setUserStatus('error');
        toast({
          title: "Error",
          description: `Failed to check user status: ${result.error}`,
          variant: "destructive",
        });
        return;
      }
      
      if (result?.exists && result?.userId) {
        setUserStatus('found');
        setUserInfo({
          email: tenantOwnerEmail,
          userId: result.userId,
          created_at: new Date().toISOString(),
          isAdmin: result.isAdmin,
          userStatus: result.userStatus
        });
        
        console.log('useTenantUserManagement: Checking user-tenant status for userId:', result.userId);
        const tenantStatusResult = await checkUserTenantStatus(tenantOwnerEmail, tenantId);
        setTenantStatus(tenantStatusResult);
      } else {
        setUserStatus('not_found');
        setUserInfo(null);
        setTenantStatus(null);
      }
    } catch (error) {
      console.error('useTenantUserManagement: Error in checkUser:', error);
      setUserStatus('error');
      toast({
        title: "Error",
        description: "An unexpected error occurred while checking user status",
        variant: "destructive",
      });
    } finally {
      isCheckingRef.current = false;
    }
  }, [checkUserExists, checkUserTenantStatus, toast]);

  // Reset refs when needed
  const resetCheck = useCallback(() => {
    isCheckingRef.current = false;
    lastCheckedRef.current = '';
  }, []);

  return {
    userStatus,
    userInfo,
    tenantStatus,
    isLoading: isCheckingUser || isCreatingUser || isSendingReset || isCheckingStatus || isFixingRelationship,
    checkUser,
    createAdminUser,
    ensureUserTenantRecord,
    sendPasswordReset,
    resetCheck,
    toast
  };
};
