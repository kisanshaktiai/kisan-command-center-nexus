import { useState, useCallback } from 'react';
import { authenticationService } from '@/services/AuthenticationService';
import { AuthState, TenantData } from '@/types/auth';
import { ServiceResult } from '@/services/BaseService';

/**
 * Hook for Authentication Service Operations
 * Provides clean interface for components to interact with auth business logic
 */
export const useAuthenticationService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleAuthOperation = useCallback(async <T>(
    operation: () => Promise<ServiceResult<T>>,
    onSuccess?: (data: T) => void,
    onError?: (error: string) => void
  ): Promise<ServiceResult<T>> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      
      if (result.success && result.data) {
        onSuccess?.(result.data);
      } else if (!result.success && result.error) {
        setError(result.error);
        onError?.(result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Authentication operations
  const signInUser = useCallback(async (
    email: string, 
    password: string,
    onSuccess?: (authState: AuthState) => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => authenticationService.signInUser(email, password),
      onSuccess,
      onError
    );
  }, [handleAuthOperation]);

  const signInAdmin = useCallback(async (
    email: string, 
    password: string,
    onSuccess?: (authState: AuthState) => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => authenticationService.signInAdmin(email, password),
      onSuccess,
      onError
    );
  }, [handleAuthOperation]);

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
      onError
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
      onSuccess,
      onError
    );
  }, [handleAuthOperation]);

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
      onError
    );
  }, [handleAuthOperation]);

  const signOut = useCallback(async (
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => authenticationService.signOut(),
      onSuccess,
      onError
    );
  }, [handleAuthOperation]);

  const resetPassword = useCallback(async (
    email: string, 
    tenantId?: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    return handleAuthOperation(
      () => {
        // TODO: Implement password reset in UnifiedAuthService
        throw new Error('Password reset not yet implemented');
      },
      onSuccess,
      onError
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