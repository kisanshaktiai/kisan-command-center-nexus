
import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { AuthState } from '@/types/auth';
import { authService } from '@/auth/AuthService';
import { supabase } from '@/integrations/supabase/client';

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
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Starting initialization...');
        authStore.setLoading(true);
        
        // Initialize the auth service
        await authService.initialize();
        
        // Get initial session
        const session = await authService.getCurrentSession();
        
        if (mounted) {
          if (session) {
            console.log('AuthProvider: Session found, updating store');
            authStore.setSession(session);
            // Load admin status will be handled by the auth state listener
          } else {
            console.log('AuthProvider: No session found');
            authStore.reset();
          }
        }
      } catch (error) {
        console.error('AuthProvider: Initialization error:', error);
        if (mounted) {
          authStore.setError('Authentication initialization failed');
        }
      } finally {
        if (mounted) {
          authStore.setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('AuthProvider: Auth state change:', event);
        
        try {
          if (session?.user) {
            // Update session in store
            authStore.setSession(session);
            
            // Check admin status
            const { data, error } = await supabase
              .from('admin_users')
              .select('role, is_active')
              .eq('id', session.user.id)
              .single();

            if (!error && data?.is_active) {
              authStore.setAuthState({
                isAdmin: true,
                isSuperAdmin: data.role === 'super_admin',
                adminRole: data.role
              });
            } else {
              authStore.setAuthState({
                isAdmin: false,
                isSuperAdmin: false,
                adminRole: null
              });
            }
          } else {
            console.log('AuthProvider: User signed out');
            authStore.reset();
          }
        } catch (error) {
          console.error('AuthProvider: Error handling auth state change:', error);
        }
      }
    );

    // Initialize after setting up listener
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const result = await authService.signOut();
    if (!result.success) {
      authStore.setError(result.error || 'Sign out failed');
    }
  };

  const handleSignUp = async (email: string, password: string, tenantData: any) => {
    // This will be implemented later for tenant registration
    return { error: new Error('User registration not yet implemented') };
  };

  return (
    <AuthContext.Provider value={{
      user: authStore.user,
      session: authStore.session,
      isAuthenticated: authStore.isAuthenticated,
      isAdmin: authStore.isAdmin,
      isSuperAdmin: authStore.isSuperAdmin,
      adminRole: authStore.adminRole,
      profile: authStore.profile,
      signOut: handleSignOut,
      signUp: handleSignUp,
      isLoading: authStore.isLoading,
      error: authStore.error,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
