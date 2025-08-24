
import { useQuery, useMutation } from '@tanstack/react-query';
import { authService } from '@/auth/AuthService';
import { AuthState, TenantData } from '@/types/auth';
import { toast } from 'sonner';

export const useCurrentAuth = () => {
  return useQuery({
    queryKey: ['auth', 'current'],
    queryFn: async () => {
      const session = await authService.getCurrentSession();
      return session;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false // Don't retry auth queries
  });
};

export const useSignInMutation = () => {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      authService.signInAdmin(email, password),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Successfully signed in!');
      } else {
        toast.error(result.error || 'Sign in failed');
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      toast.error(errorMessage);
    }
  });
};

export const useSignOutMutation = () => {
  return useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Successfully signed out');
      } else {
        toast.error(result.error || 'Sign out failed');
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      toast.error(errorMessage);
    }
  });
};

export const useSignUpMutation = () => {
  return useMutation({
    mutationFn: ({ email, password, tenantData }: { 
      email: string; 
      password: string; 
      tenantData?: TenantData;
    }) => {
      // For now, sign up is not implemented in the new auth service
      throw new Error('Sign up not yet implemented');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      toast.error(errorMessage);
    }
  });
};

export const useUserRole = (userId?: string) => {
  return useQuery({
    queryKey: ['auth', 'role', userId],
    queryFn: async () => {
      if (!userId) return null;
      // This functionality needs to be implemented in AuthService
      return null;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
