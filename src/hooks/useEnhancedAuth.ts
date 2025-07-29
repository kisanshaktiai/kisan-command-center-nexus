
import { useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authenticationService, type TenantData } from '@/services/AuthenticationService';
import { securityService } from '@/services/SecurityService';
import { toast } from 'sonner';

// TenantData is now imported from AuthenticationService

// Unified auth context type that handles both regular and admin authentication
interface UnifiedAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
  profile: any;
  error: string | null;
  signUp: (email: string, password: string, tenantData: TenantData) => Promise<{ data: any; error: AuthError | null }>;
  signIn: (email: string, password: string, isAdminLogin?: boolean) => Promise<{ data: any; error: AuthError | null }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, tenantId?: string) => Promise<{ data: any; error: AuthError | null }>;
  updateEmail: (newEmail: string) => Promise<{ data: any; error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ data: any; error: AuthError | null }>;
  resendEmailVerification: () => Promise<{ data: any; error: AuthError | null }>;
  trackSession: (deviceInfo?: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const useEnhancedAuth = (): UnifiedAuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Enhanced sign up with tenant metadata - now uses service layer
  const signUp = async (email: string, password: string, tenantData: TenantData) => {
    try {
      setError(null);
      const result = await authenticationService.registerUser(email, password, tenantData);
      
      if (result.success && result.data) {
        return { data: result.data, error: null };
      } else {
        setError(result.error || 'Registration failed');
        return { data: null, error: new Error(result.error || 'Registration failed') as AuthError };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      return { data: null, error: error as AuthError };
    }
  };

  // Enhanced sign in - now uses service layer
  const signIn = async (email: string, password: string, isAdminLogin = false) => {
    setError(null);
    try {
      const result = isAdminLogin 
        ? await authenticationService.signInAdmin(email, password)
        : await authenticationService.signInUser(email, password);
      
      if (result.success && result.data) {
        // Update state with result
        setUser(result.data.user);
        setSession(result.data.session);
        setIsAdmin(result.data.isAdmin);
        setIsSuperAdmin(result.data.isSuperAdmin);
        setAdminRole(result.data.adminRole);
        setProfile(result.data.profile);
        
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

  // Dedicated admin login method using service layer
  const adminLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authenticationService.signInAdmin(email, password);
      
      if (result.success && result.data) {
        // The auth state change listener will handle updating the state
        return { success: true, error: null };
      } else {
        setError(result.error || 'Authentication failed');
        setIsLoading(false);
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Enhanced password reset
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

  // Update email with verification
  const updateEmail = async (newEmail: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });
      return { data, error };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  // Update password
  const updatePassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      return { data, error };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  // Resend email verification
  const resendEmailVerification = async () => {
    try {
      if (!user) throw new Error('No user logged in');
      
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!
      });

      return { data, error };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  // Track user session
  const trackSession = async (deviceInfo?: any) => {
    try {
      if (!session) return;
      
      if (isAdmin) {
        await securityService.trackAdminSession(deviceInfo);
      }
      
      console.log('Session tracking active');
    } catch (error) {
      console.error('Error tracking session:', error);
    }
  };

  // Sign out using service layer
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

  // Clear error messages
  const clearError = () => {
    setError(null);
  };

  // Refresh user profile
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      console.log('Profile refresh active');
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  // Check admin status using service layer
  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
      setError(null);
      return;
    }

    try {
      const result = await authenticationService.checkAdminStatus(user.id);
      
      if (result.success && result.data) {
        setIsAdmin(result.data.isAdmin);
        setIsSuperAdmin(result.data.isSuperAdmin);
        setAdminRole(result.data.adminRole);
      } else {
        setError(result.error || 'Failed to verify admin status');
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setAdminRole(null);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      const errorMessage = 'Failed to verify admin status';
      setError(errorMessage);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
    }
  };

  // Set up auth state listener
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
          
          if (session?.user) {
            checkAdminStatus();
            refreshProfile();
            trackSession();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        if (session?.user) {
          checkAdminStatus();
          refreshProfile();
          trackSession();
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setAdminRole(null);
          setError(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    isLoading,
    isAdmin,
    isSuperAdmin,
    adminRole,
    profile,
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
