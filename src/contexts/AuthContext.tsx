
import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { AuthState } from '@/types/auth';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

const AuthContext = createContext<AuthState & {
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, tenantData: any) => Promise<{ data?: any; error?: any }>;
  isLoading: boolean;
  error: string | null;
}>({
  user: null,
  session: null,
  isAuthenticated: false,
  isAdmin: false,
  isSuperAdmin: false,
  adminRole: null,
  profile: null,
  signOut: async () => {},
  signUp: async () => ({ error: new Error('Not implemented') }),
  isLoading: false,
  error: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authStore = useAuthStore();
  
  // Use session timeout to prevent infinite loading states
  const { forceReload } = useSessionTimeout(15000); // 15 second timeout

  useEffect(() => {
    let initPromise: Promise<void> | null = null;
    
    // Initialize auth state on mount
    const initAuth = async () => {
      try {
        console.log('AuthProvider: Starting initialization...');
        const { unifiedAuthService } = await import('@/lib/services/unifiedAuthService');
        
        // Prevent multiple concurrent initializations
        if (!initPromise) {
          initPromise = unifiedAuthService.initialize();
        }
        
        await initPromise;
        console.log('AuthProvider: Initialization completed');
      } catch (error) {
        console.error('AuthProvider: Error initializing auth:', error);
        authStore.setError('Authentication system failed to initialize');
        
        // If initialization fails completely, provide recovery option
        setTimeout(() => {
          if (authStore.isLoading && !authStore.user) {
            console.error('AuthProvider: Initialization stuck, offering reload');
            authStore.setError('Authentication failed to load. Please refresh the page.');
          }
        }, 10000);
      } finally {
        authStore.setLoading(false);
      }
    };

    initAuth();

    // Cleanup on unmount
    return () => {
      initPromise = null;
    };
  }, []);

  // Add debugging for auth state changes
  useEffect(() => {
    console.log('AuthProvider: Auth state changed:', {
      hasUser: !!authStore.user,
      isAdmin: authStore.isAdmin,
      isLoading: authStore.isLoading,
      hasError: !!authStore.error
    });
  }, [authStore.user, authStore.isAdmin, authStore.isLoading, authStore.error]);

  return (
    <AuthContext.Provider value={{
      user: authStore.user,
      session: authStore.session,
      isAuthenticated: authStore.isAuthenticated,
      isAdmin: authStore.isAdmin,
      isSuperAdmin: authStore.isSuperAdmin,
      adminRole: authStore.adminRole,
      profile: authStore.profile,
      signOut: authStore.signOut,
      signUp: authStore.signUp,
      isLoading: authStore.isLoading,
      error: authStore.error,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
