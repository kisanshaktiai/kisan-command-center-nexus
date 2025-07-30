
import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { AuthState } from '@/types/auth';

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

  useEffect(() => {
    // Initialize auth state on mount
    const initAuth = async () => {
      try {
        const { unifiedAuthService } = await import('@/lib/services/unifiedAuthService');
        // Use the initialize method that exists
        await unifiedAuthService.initialize();
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        authStore.setLoading(false);
      }
    };

    initAuth();
  }, []);

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
