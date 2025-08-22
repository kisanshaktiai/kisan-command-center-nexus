
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/AuthService';
import { AuthState, TenantData } from '@/types/auth';

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, tenantData: TenantData) => Promise<{ data?: any; error?: any }>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
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
  clearError: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  useEffect(() => {
    let mounted = true;

    // Initialize auth state
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const currentAuthState = await authService.getCurrentAuthState();
        
        if (mounted) {
          setAuthState(currentAuthState);
          setError(null);
        }
      } catch (error) {
        console.error('AuthProvider: Failed to initialize auth:', error);
        if (mounted) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Subscribe to auth state changes
    const unsubscribe = authService.subscribeToAuthStateChanges((newAuthState) => {
      if (mounted) {
        setAuthState(newAuthState);
        setError(null);
      }
    });

    initAuth();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setError(null);
      const result = await authService.signOut();
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setError(errorMessage);
    }
  };

  const signUp = async (email: string, password: string, tenantData: TenantData) => {
    try {
      setError(null);
      const result = await authService.signUp(email, password, tenantData);
      
      if (result.success) {
        return { data: result.data };
      } else {
        setError(result.error || 'Sign up failed');
        return { error: new Error(result.error || 'Sign up failed') };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
      return { error: new Error(errorMessage) };
    }
  };

  const clearError = () => {
    setError(null);
  };

  const contextValue: AuthContextType = {
    ...authState,
    signOut,
    signUp,
    isLoading,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
