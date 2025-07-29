
import { useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/services/AuthService';
import { securityService } from '@/services/SecurityService';
import { unifiedAuthService } from '@/services/UnifiedAuthService';
import { toast } from 'sonner';

interface TenantData {
  organizationName: string;
  organizationType: string;
  tenantId?: string;
  fullName: string;
  phone: string;
}

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

  // Enhanced sign up with tenant metadata
  const signUp = async (email: string, password: string, tenantData: TenantData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback${tenantData.tenantId ? `?tenant=${tenantData.tenantId}` : ''}`,
          data: {
            organization_name: tenantData.organizationName,
            organization_type: tenantData.organizationType,
            tenant_id: tenantData.tenantId,
            full_name: tenantData.fullName,
            phone: tenantData.phone
          }
        }
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  // Enhanced sign in using auth service - now supports both user and admin authentication
  const signIn = async (email: string, password: string, isAdminLogin = false) => {
    setError(null);
    try {
      const result = isAdminLogin 
        ? await authService.authenticateAdmin(email, password)
        : await authService.authenticateUser(email, password);
      
      // Update admin state immediately for admin login
      if (isAdminLogin && !result.error) {
        const adminResult = result as any; // Cast to access admin properties
        setIsAdmin(adminResult.isAdmin || false);
        setIsSuperAdmin(adminResult.isSuperAdmin || false);
        setAdminRole(adminResult.adminRole || null);
      }
      
      return { data: result, error: result.error };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      return { data: null, error: error as AuthError };
    }
  };

  // Dedicated admin login method using UnifiedAuthService
  const adminLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await unifiedAuthService.adminLogin(email, password);
      
      if (result.error) {
        setError(result.error?.message || 'Authentication failed');
        setIsLoading(false);
        return { success: false, error: result.error?.message || 'Authentication failed' };
      }

      // The auth state change listener will handle updating the state
      return { success: true, error: null };
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

  // Sign out using auth service
  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      toast.success('Successfully logged out');
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

  // Check admin status
  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
      setError(null);
      return;
    }

    try {
      const [adminStatus, superAdminStatus, role] = await Promise.all([
        securityService.isCurrentUserAdmin(),
        securityService.isCurrentUserSuperAdmin(),
        securityService.getCurrentAdminRole()
      ]);

      setIsAdmin(adminStatus);
      setIsSuperAdmin(superAdminStatus);
      setAdminRole(role);
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
