import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';
import { UserTenantService, UserTenantStatus, TenantRelationshipStatus } from '@/services/UserTenantService';

interface UserExistsResult {
  exists: boolean;
  isAdmin?: boolean;
  userId?: string;
  userStatus?: string;
  error?: string;
}

interface CreateUserResult {
  success: boolean;
  userId?: string;
  email?: string;
  isNewUser?: boolean;
  emailSent?: boolean;
  tempPassword?: string;
  error?: string;
}

export const useTenantUserManagement = () => {
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isFixingRelationship, setIsFixingRelationship] = useState(false);
  const [isEnsuringRelationship, setIsEnsuringRelationship] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const checkUserExists = useCallback(async (email: string): Promise<UserExistsResult | null> => {
    if (!email) return null;
    
    setIsCheckingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email }
      });

      if (error) {
        console.error('Error checking user:', error);
        return { exists: false, error: error.message };
      }

      return {
        exists: data?.exists || false,
        isAdmin: data?.isAdmin || false,
        userId: data?.userId,
        userStatus: data?.userStatus,
        error: data?.error
      };
    } catch (error) {
      console.error('Failed to check user:', error);
      return { 
        exists: false, 
        error: error instanceof Error ? error.message : 'Failed to check user'
      };
    } finally {
      setIsCheckingUser(false);
    }
  }, []);

  /**
   * Enhanced method that checks and ensures tenant relationship
   */
  const checkAndEnsureTenantRelationship = useCallback(async (
    email: string, 
    tenantId: string
  ): Promise<TenantRelationshipStatus | null> => {
    if (!email || !tenantId) return null;
    
    setIsEnsuringRelationship(true);
    try {
      const status = await UserTenantService.checkAndEnsureTenantRelationship(email, tenantId);
      
      if (status.hasRelationship && status.isValid) {
        showSuccess('Tenant relationship validated successfully');
      } else if (status.hasRelationship && !status.isValid) {
        showError(`Tenant relationship has issues: ${status.issues.join(', ')}`);
      } else if (!status.hasRelationship) {
        showError(`No tenant relationship found: ${status.issues.join(', ')}`);
      }
      
      return status;
    } catch (error) {
      console.error('Failed to check and ensure tenant relationship:', error);
      showError('Failed to check tenant relationship');
      return null;
    } finally {
      setIsEnsuringRelationship(false);
    }
  }, [showSuccess, showError]);

  const checkUserTenantStatus = useCallback(async (
    email: string, 
    tenantId: string
  ): Promise<UserTenantStatus | null> => {
    if (!email || !tenantId) return null;
    
    setIsCheckingStatus(true);
    try {
      const status = await UserTenantService.checkUserTenantStatus(email, tenantId);
      return status;
    } catch (error) {
      console.error('Failed to check user-tenant status:', error);
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  const ensureUserTenantRecord = useCallback(async (
    userId: string,
    tenantId: string
  ): Promise<boolean> => {
    if (!userId || !tenantId) return false;
    
    setIsFixingRelationship(true);
    try {
      const result = await UserTenantService.ensureUserTenantRecord(userId, tenantId);
      
      if (result.success) {
        showSuccess('User-tenant relationship created successfully');
        return true;
      } else {
        showError(result.error || 'Failed to create user-tenant relationship');
        return false;
      }
    } catch (error) {
      console.error('Failed to ensure user-tenant record:', error);
      showError('Failed to create user-tenant relationship');
      return false;
    } finally {
      setIsFixingRelationship(false);
    }
  }, [showSuccess, showError]);

  const createTenantAsUser = useCallback(async (
    email: string, 
    fullName: string, 
    tenantId?: string
  ): Promise<CreateUserResult | null> => {
    if (!email || !fullName) return null;
    
    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-user-with-welcome', {
        body: {
          email,
          fullName,
          tenantId,
          role: 'tenant_user',
          sendWelcomeEmail: true,
          welcomeEmailData: {
            tenantName: 'Your Organization',
            loginUrl: `${window.location.origin}/auth`,
            customMessage: 'You have been added as a user for your organization.'
          }
        }
      });

      if (error) {
        console.error('Error creating user:', error);
        showError('Failed to create user');
        return { success: false, error: error.message };
      }

      if (data?.success) {
        showSuccess('User created successfully!');
        return data;
      } else {
        showError(data?.error || 'Failed to create user');
        return { success: false, error: data?.error };
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      showError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreatingUser(false);
    }
  }, [showSuccess, showError]);

  const createAdminUser = useCallback(async (
    email: string, 
    fullName: string, 
    tenantId?: string
  ): Promise<CreateUserResult | null> => {
    if (!email || !fullName) return null;
    
    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-user-with-welcome', {
        body: {
          email,
          fullName,
          tenantId,
          role: 'tenant_admin',
          sendWelcomeEmail: true,
          welcomeEmailData: {
            tenantName: 'Your Organization',
            loginUrl: `${window.location.origin}/auth`,
            customMessage: 'You have been added as an admin for your organization.'
          }
        }
      });

      if (error) {
        console.error('Error creating user:', error);
        showError('Failed to create admin user');
        return { success: false, error: error.message };
      }

      if (data?.success) {
        showSuccess('Admin user created successfully!');
        return data;
      } else {
        showError(data?.error || 'Failed to create admin user');
        return { success: false, error: data?.error };
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create admin user';
      showError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreatingUser(false);
    }
  }, [showSuccess, showError]);

  const sendPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    if (!email) return false;
    
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        console.error('Error sending password reset:', error);
        showError('Failed to send password reset email');
        return false;
      }

      showSuccess('Password reset email sent successfully!');
      return true;
    } catch (error) {
      console.error('Failed to send password reset:', error);
      showError('Failed to send password reset email');
      return false;
    } finally {
      setIsSendingReset(false);
    }
  }, [showSuccess, showError]);

  return {
    // State
    isCheckingUser,
    isCreatingUser,
    isSendingReset,
    isCheckingStatus,
    isFixingRelationship,
    isEnsuringRelationship,
    
    // Actions
    checkUserExists,
    checkUserTenantStatus,
    checkAndEnsureTenantRelationship,
    ensureUserTenantRecord,
    createTenantAsUser,
    createAdminUser,
    sendPasswordReset
  };
};
