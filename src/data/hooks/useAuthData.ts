
import { useQuery, useMutation } from '@tanstack/react-query';
import { unifiedAuthService } from '@/services/auth/UnifiedAuthService';
import { AuthState, TenantData } from '@/types/auth';
import { unifiedErrorService } from '@/services/core/UnifiedErrorService';
import { toast } from 'sonner';

export const useCurrentAuth = () => {
  return useQuery({
    queryKey: ['auth', 'current'],
    queryFn: () => unifiedAuthService.getCurrentAuthState(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false // Don't retry auth queries
  });
};

export const useSignInMutation = () => {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      unifiedAuthService.signIn(email, password),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Successfully signed in!');
      } else {
        toast.error(result.error || 'Sign in failed');
      }
    },
    onError: (error) => {
      const errorResult = unifiedErrorService.handleAuthError(error, 'signIn');
      if (errorResult.shouldShowNotification) {
        toast.error(errorResult.userMessage);
      }
    }
  });
};

export const useSignOutMutation = () => {
  return useMutation({
    mutationFn: () => unifiedAuthService.signOut(),
    onSuccess: () => {
      toast.success('Successfully signed out');
    },
    onError: (error) => {
      const errorResult = unifiedErrorService.handleAuthError(error, 'signOut');
      if (errorResult.shouldShowNotification) {
        toast.error(errorResult.userMessage);
      }
    }
  });
};

export const useSignUpMutation = () => {
  return useMutation({
    mutationFn: ({ email, password, tenantData }: { 
      email: string; 
      password: string; 
      tenantData?: TenantData;
    }) => unifiedAuthService.signUp(email, password, tenantData),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Registration successful!');
      } else {
        toast.error(result.error || 'Registration failed');
      }
    },
    onError: (error) => {
      const errorResult = unifiedErrorService.handleAuthError(error, 'signUp');
      if (errorResult.shouldShowNotification) {
        toast.error(errorResult.userMessage);
      }
    }
  });
};

export const useUserRole = (userId?: string) => {
  return useQuery({
    queryKey: ['auth', 'role', userId],
    queryFn: () => userId ? unifiedAuthService.checkUserRole(userId) : null,
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
