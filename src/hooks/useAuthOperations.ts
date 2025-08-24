
import { useCallback } from 'react';
import { authService } from '@/auth/AuthService';
import { AuthState, TenantData } from '@/types/auth';

export const useAuthOperations = () => {
  const signUp = useCallback(async (email: string, password: string, tenantData?: TenantData) => {
    try {
      // Use bootstrap for admin creation
      const result = await authService.bootstrapSuperAdmin(email, password, tenantData?.fullName || '');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      return { success: false, error: errorMessage };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('useAuthOperations: Signing out');
      const result = await authService.signOut();
      console.log('useAuthOperations: Sign out completed');
      return result;
    } catch (error) {
      console.error('useAuthOperations: Sign out error:', error);
      throw error;
    }
  }, []);

  return {
    signUp,
    signOut,
  };
};
