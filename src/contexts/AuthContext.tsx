
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/auth/AuthService';
import { AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isAdmin: false,
    isSuperAdmin: false,
    adminRole: null,
    profile: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAuth = async () => {
    try {
      setError(null);
      const session = await authService.getCurrentSession();
      
      if (session?.user) {
        // Check admin status
        const adminStatus = await checkAdminStatus(session.user.id);
        
        setAuthState({
          user: session.user,
          session: session,
          isAuthenticated: true,
          isAdmin: adminStatus.isAdmin,
          isSuperAdmin: adminStatus.isSuperAdmin,
          adminRole: adminStatus.adminRole,
          profile: null, // Will be loaded separately if needed
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          isAuthenticated: false,
          isAdmin: false,
          isSuperAdmin: false,
          adminRole: null,
          profile: null,
        });
      }
    } catch (error) {
      console.error('AuthContext: Failed to refresh auth:', error);
      setError(error instanceof Error ? error.message : 'Authentication error');
      
      // Reset to unauthenticated state on error
      setAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null,
        profile: null,
      });
    }
  };

  const checkAdminStatus = async (userId: string): Promise<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: string | null;
  }> => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('id', userId)
        .single();

      if (error || !data || !data.is_active) {
        return { isAdmin: false, isSuperAdmin: false, adminRole: null };
      }

      return {
        isAdmin: true,
        isSuperAdmin: data.role === 'super_admin',
        adminRole: data.role
      };
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return { isAdmin: false, isSuperAdmin: false, adminRole: null };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await authService.signOut();
      setAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null,
        profile: null,
      });
    } catch (error) {
      console.error('AuthContext: Sign out error:', error);
      setError(error instanceof Error ? error.message : 'Sign out failed');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      await refreshAuth();
      if (mounted) {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event);
      
      if (mounted) {
        if (event === 'SIGNED_OUT' || !session) {
          setAuthState({
            user: null,
            session: null,
            isAuthenticated: false,
            isAdmin: false,
            isSuperAdmin: false,
            adminRole: null,
            profile: null,
          });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshAuth();
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
