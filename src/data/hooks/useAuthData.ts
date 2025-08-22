
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/AuthService';

export const useAuthData = () => {
  const { data: authState, isLoading: authLoading, error: authError } = useQuery({
    queryKey: ['auth-state'],
    queryFn: async () => {
      const result = await authService.getCurrentAuthState();
      return result;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: adminStatus, isLoading: adminLoading, error: adminError } = useQuery({
    queryKey: ['admin-status'],
    queryFn: async () => {
      const result = await authService.getAdminStatus();
      return result;
    },
    enabled: !!authState?.user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    authState,
    adminStatus,
    isLoading: authLoading || adminLoading,
    error: authError || adminError,
  };
};
