
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/AuthService';
import { AuthState } from '@/types/auth';

export const useAuthData = () => {
  return useQuery({
    queryKey: ['auth-data'],
    queryFn: () => authService.getCurrentAuthState(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Legacy export for compatibility
export const useCurrentAuth = useAuthData;
