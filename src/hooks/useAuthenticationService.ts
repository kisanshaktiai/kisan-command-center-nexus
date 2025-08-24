
import { authService } from '@/auth/AuthService';
import { useAuthStore } from '@/lib/stores/authStore';

/**
 * Hook to access authentication service functionality
 * This is a simple wrapper around the unified AuthService
 */
export const useAuthenticationService = () => {
  const authStore = useAuthStore();

  return {
    signIn: authService.signInAdmin.bind(authService),
    signOut: authService.signOut.bind(authService),
    getCurrentSession: authService.getCurrentSession.bind(authService),
    isBootstrapNeeded: authService.isBootstrapNeeded.bind(authService),
    bootstrapSuperAdmin: authService.bootstrapSuperAdmin.bind(authService),
    
    // Access to auth store state
    user: authStore.user,
    session: authStore.session,
    isAuthenticated: authStore.isAuthenticated,
    isAdmin: authStore.isAdmin,
    isSuperAdmin: authStore.isSuperAdmin,
    isLoading: authStore.isLoading,
    error: authStore.error,
  };
};
