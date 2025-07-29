
import { useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authenticationService } from '@/services/AuthenticationService';
import { AuthState, TenantData, UserProfile } from '@/types/auth';
import { toast } from 'sonner';

// Simplified auth hook - just a React wrapper around AuthenticationService
interface UnifiedAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
  profile: UserProfile | null;
  error: string | null;
  signUp: (email: string, password: string, tenantData: TenantData) => Promise<{ data: AuthState | null; error: AuthError | null }>;
  signIn: (email: string, password: string, isAdminLogin?: boolean) => Promise<{ data: AuthState | null; error: AuthError | null }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, tenantId?: string) => Promise<{ data: any; error: AuthError | null }>;
  updateEmail: (newEmail: string) => Promise<{ data: any; error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ data: any; error: AuthError | null }>;
  resendEmailVerification: () => Promise<{ data: any; error: AuthError | null }>;
  trackSession: (deviceInfo?: Record<string, unknown>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const useEnhancedAuth = (): UnifiedAuthContextType => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isAdmin: false,
    isSuperAdmin: false,
    adminRole: null,
    profile: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from service
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Enhanced Auth: Initializing authentication...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Enhanced Auth: Session error:', error);
          setError('Failed to get session');
        }
        
        if (mounted) {
          console.log('Enhanced Auth: Session found:', session?.user?.id || 'No session');
          
          if (session?.user) {
            console.log('Enhanced Auth: User authenticated, getting auth state...');
            const currentAuthState = await authenticationService.getCurrentAuthState();
            setAuthState(currentAuthState);
          } else {
            console.log('Enhanced Auth: No authenticated user found');
            setAuthState({
              user: null,
              session: null,
              isAuthenticated: false,
              isAdmin: false,
              isSuperAdmin: false,
              adminRole: null,
              profile: null
            });
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Enhanced Auth: Initialization error:', error);
        if (mounted) {
          setError('Authentication initialization failed');
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);

        if (session?.user) {
          const currentAuthState = await authenticationService.getCurrentAuthState();
          setAuthState(currentAuthState);
        } else {
          setAuthState({
            user: null,
            session: null,
            isAuthenticated: false,
            isAdmin: false,
            isSuperAdmin: false,
            adminRole: null,
            profile: null
          });
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Wrapper functions around AuthenticationService
  const signUp = async (email: string, password: string, tenantData: TenantData) => {
    try {
      setError(null);
      // TODO: Implement user registration in AuthenticationService
      throw new Error('User registration not yet implemented');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      return { data: null, error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string, isAdminLogin = false) => {
    setError(null);
    try {
      const result = isAdminLogin 
        ? await authenticationService.signInAdmin(email, password)
        : await authenticationService.signInUser(email, password);
      
      if (result.success && result.data) {
        return { data: result.data, error: null };
      } else {
        setError(result.error || 'Authentication failed');
        return { data: null, error: new Error(result.error || 'Authentication failed') as AuthError };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      return { data: null, error: error as AuthError };
    }
  };

  const adminLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authenticationService.signInAdmin(email, password);
      setIsLoading(false);
      
      if (result.success) {
        return { success: true, error: null };
      } else {
        setError(result.error || 'Authentication failed');
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const result = await authenticationService.signOut();
      if (!result.success) {
        console.error('Sign out failed:', result.error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error during logout');
    }
  };

  // Other auth methods (simplified)
  const resetPassword = async (email: string, tenantId?: string) => {
    try {
      const redirectUrl = tenantId 
        ? `${window.location.origin}/auth/reset-password?tenant=${tenantId}`
        : `${window.location.origin}/auth/reset-password`;
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      return { data, error };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({ email: newEmail });
      return { data, error };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      return { data, error };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  const resendEmailVerification = async () => {
    try {
      if (!authState.user) throw new Error('No user logged in');
      
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: authState.user.email!
      });
      return { data, error };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  const trackSession = async (deviceInfo?: Record<string, unknown>) => {
    try {
      if (!authState.session) return;
      console.log('Session tracking active');
    } catch (error) {
      console.error('Error tracking session:', error);
    }
  };

  const refreshProfile = async () => {
    if (!authState.user) return;
    
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authState.user.id)
        .single();
      
      if (profileData) {
        setAuthState(prev => ({ ...prev, profile: profileData }));
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    user: authState.user,
    session: authState.session,
    isLoading,
    isAdmin: authState.isAdmin,
    isSuperAdmin: authState.isSuperAdmin,
    adminRole: authState.adminRole,
    profile: authState.profile,
    error,
    signUp,
    signIn,
    adminLogin,
    signOut,
    resetPassword,
    updateEmail,
    updatePassword,
    resendEmailVerification,
    trackSession,
    refreshProfile,
    clearError
  };
};
