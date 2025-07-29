import { useState, useCallback } from 'react';
import { authenticationService, type AuthResult, type AuthState, type TenantData } from '@/services/AuthenticationService';

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
    operation: () => Promise<AuthResult<T>>,
    onSuccess?: (data: T) => void,
    onError?: (error: string) => void
  ): Promise<AuthResult<T>> => {
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
      () => authenticationService.registerUser(email, password, tenantData),
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
      () => authenticationService.checkAdminStatus(userId),
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
      () => authenticationService.resetPassword(email, tenantId),
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