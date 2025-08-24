
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/auth/AuthService';
import { AuthState, TenantData } from '@/types/auth';
import { useAuthState } from '@/hooks/useAuthState';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useAuthOperations } from '@/hooks/useAuthOperations';

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, tenantData?: TenantData) => Promise<{ success: boolean; error?: string; data?: AuthState }>;
  refreshAuth: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { 
    authState, 
    isLoading, 
    error, 
    updateAuthState, 
    resetAuthState, 
    setAuthError, 
    setAuthLoading 
  } = useAuthState();
  
  const { checkAdminStatus } = useAdminStatus();
  const { signUp: performSignUp, signOut: performSignOut } = useAuthOperations();

  const refreshAuth = async () => {
    try {
      setAuthError(null);
      console.log('AuthProvider: Refreshing auth state');
      
      const session = await authService.getCurrentSession();
      
      if (session?.user) {
        console.log('AuthProvider: Session found, checking admin status');
        
        // Check admin status using the admin_users table
        const adminStatus = await checkAdminStatus(session.user.id);
        
        updateAuthState({
          user: session.user,
          session: session,
          isAuthenticated: true,
          isAdmin: adminStatus.isAdmin,
          isSuperAdmin: adminStatus.isSuperAdmin,
          adminRole: adminStatus.adminRole,
          profile: null, // Will be loaded separately if needed
        });
        
        console.log('AuthProvider: Auth state updated', { isAdmin: adminStatus.isAdmin });
      } else {
        console.log('AuthProvider: No session found');
        resetAuthState();
      }
    } catch (error) {
      console.error('AuthProvider: Failed to refresh auth:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication error');
      resetAuthState();
    }
  };

  const signUp = async (email: string, password: string, tenantData?: TenantData) => {
    try {
      setAuthError(null);
      const result = await performSignUp(email, password, tenantData);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      setAuthError(null);
      console.log('AuthProvider: Signing out');
      
      await performSignOut();
      resetAuthState();
      
      console.log('AuthProvider: Sign out completed');
    } catch (error) {
      console.error('AuthProvider: Sign out error:', error);
      setAuthError(error instanceof Error ? error.message : 'Sign out failed');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('AuthProvider: Initializing auth');
      await refreshAuth();
      if (mounted) {
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event);
      
      if (mounted) {
        if (event === 'SIGNED_OUT' || !session) {
          console.log('AuthProvider: User signed out or no session');
          resetAuthState();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('AuthProvider: User signed in or token refreshed');
          // Use setTimeout to avoid potential database conflicts
          setTimeout(() => {
            refreshAuth();
          }, 100);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    signUp,
    refreshAuth,
    isLoading,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
