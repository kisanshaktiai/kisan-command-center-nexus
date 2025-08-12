
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';

interface UserExistsResult {
  userExists: boolean;
  user: {
    id: string;
    email: string;
    created_at: string;
  } | null;
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
        return { userExists: false, user: null, error: error.message };
      }

      return data;
    } catch (error) {
      console.error('Failed to check user:', error);
      return { 
        userExists: false, 
        user: null, 
        error: error instanceof Error ? error.message : 'Failed to check user'
      };
    } finally {
      setIsCheckingUser(false);
    }
  }, []);

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
    
    // Actions
    checkUserExists,
    createAdminUser,
    sendPasswordReset
  };
};
