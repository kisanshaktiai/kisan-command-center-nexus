import { useState, useCallback } from 'react';
import { authenticationService } from '@/services/AuthenticationService';
import { AuthState, TenantData } from '@/types/auth';
import { ServiceResult } from '@/services/BaseService';
import { useNotifications } from './useNotifications';
import { useAuthStore } from '@/lib/stores/authStore';

/**
 * Hook for Authentication Service Operations
 * Provides clean interface for components to interact with auth business logic
 */
export const useAuthenticationService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useNotifications();
  const authStore = useAuthStore();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleAuthOperation = useCallback(async <T>(
    operation: () => Promise<ServiceResult<T>>,
    onSuccess?: (data: T) => void,
    onError?: (error: string) => void,
    showNotifications: { success?: string; error?: boolean } = { error: true }
  ): Promise<ServiceResult<T>> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      
      if (result.success && result.data) {
        if (showNotifications.success) {
          showSuccess(showNotifications.success);
        }
        onSuccess?.(result.data);
      } else if (!result.success && result.error) {
        setError(result.error);
        if (showNotifications.error) {
          showError(result.error);
        }
        onError?.(result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      if (showNotifications.error) {
        showError(errorMessage);
      }
      onError?.(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  // Authentication operations
  const signInUser = useCallback(async (
    email: string, 
    password: string,
    onSuccess?: (authState: AuthState) => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => authenticationService.signInUser(email, password),
      (authState) => {
        console.log('User signed in, updating auth state:', authState);
        // Update all auth state properties atomically
        authStore.setUser(authState.user);
        authStore.setSession(authState.session);
        authStore.setAuthState({
          isAuthenticated: authState.isAuthenticated,
          isAdmin: authState.isAdmin,
          isSuperAdmin: authState.isSuperAdmin,
          adminRole: authState.adminRole,
          profile: authState.profile
        });
        onSuccess?.(authState);
      },
      onError,
      { success: 'Successfully signed in!' }
    );
  }, [handleAuthOperation, authStore]);

  const signInAdmin = useCallback(async (
    email: string, 
    password: string,
    onSuccess?: (authState: AuthState) => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => authenticationService.signInAdmin(email, password),
      (authState) => {
        console.log('Admin signed in, updating auth state:', authState);
        // Update all auth state properties atomically and immediately
        authStore.setUser(authState.user);
        authStore.setSession(authState.session);
        authStore.setAuthState({
          isAuthenticated: authState.isAuthenticated,
          isAdmin: authState.isAdmin,
          isSuperAdmin: authState.isSuperAdmin,
          adminRole: authState.adminRole,
          profile: authState.profile
        });
        
        // Force immediate state update
        authStore.setLoading(false);
        
        console.log('Auth store updated:', {
          hasUser: !!authStore.user,
          isAdmin: authStore.isAdmin,
          isSuperAdmin: authStore.isSuperAdmin,
          isAuthenticated: authStore.isAuthenticated
        });
        
        onSuccess?.(authState);
      },
      onError,
      { success: 'Welcome back, admin!' }
    );
  }, [handleAuthOperation, authStore]);

  const registerUser = useCallback(async (
    email: string, 
    password: string, 
    tenantData: TenantData,
    onSuccess?: (data: { user: any; session: any }) => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => {
        // TODO: Implement user registration in UnifiedAuthService
        throw new Error('User registration not yet implemented');
      },
      onSuccess,
      onError,
      { success: 'Registration successful!' }
    );
  }, [handleAuthOperation]);

  const bootstrapSuperAdmin = useCallback(async (
    email: string, 
    password: string, 
    fullName: string,
    onSuccess?: (authState: AuthState) => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => authenticationService.bootstrapSuperAdmin(email, password, fullName),
      (authState) => {
        console.log('Super admin bootstrapped, updating auth state:', authState);
        // Update all auth state properties atomically
        authStore.setUser(authState.user);
        authStore.setSession(authState.session);
        authStore.setAuthState({
          isAuthenticated: authState.isAuthenticated,
          isAdmin: authState.isAdmin,
          isSuperAdmin: authState.isSuperAdmin,
          adminRole: authState.adminRole,
          profile: authState.profile
        });
        authStore.setLoading(false);
        onSuccess?.(authState);
      },
      onError,
      { success: 'System initialized successfully!' }
    );
  }, [handleAuthOperation, authStore]);

  const checkAdminStatus = useCallback(async (
    userId: string,
    onSuccess?: (data: { isAdmin: boolean; isSuperAdmin: boolean; adminRole: string | null }) => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      async () => {
        const authState = await authenticationService.getCurrentAuthState();
        return {
          success: true,
          data: {
            isAdmin: authState.isAdmin,
            isSuperAdmin: authState.isSuperAdmin,
            adminRole: authState.adminRole
          }
        };
      },
      onSuccess,
      onError,
      { error: false } // Don't show error notifications for status checks
    );
  }, [handleAuthOperation]);

  const signOut = useCallback(async (
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => authenticationService.signOut(),
      onSuccess,
      onError,
      { success: 'Successfully signed out' }
    );
  }, [handleAuthOperation]);

  const resetPassword = useCallback(async (
    email: string, 
    tenantId?: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => authenticationService.resetPassword(email, tenantId),
      onSuccess,
      onError,
      { success: 'Password reset email sent!' }
    );
  }, [handleAuthOperation]);

  return {
    // State
    isLoading,
    error,
    clearError,

    // Operations
    signInUser,
    signInAdmin,
    registerUser,
    bootstrapSuperAdmin,
    checkAdminStatus,
    signOut,
    resetPassword
  };
};
