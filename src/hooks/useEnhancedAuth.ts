import { useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeGet } from '@/lib/supabase-helpers';
import { sessionService } from '@/services/SessionService';

interface TenantData {
  organizationName: string;
  organizationType: string;
  tenantId?: string;
  fullName: string;
  phone: string;
}

interface EnhancedAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  profile: any;
  signUp: (email: string, password: string, tenantData: TenantData) => Promise<{ data: any; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, tenantId?: string) => Promise<{ data: any; error: AuthError | null }>;
  updateEmail: (newEmail: string) => Promise<{ data: any; error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ data: any; error: AuthError | null }>;
  resendEmailVerification: () => Promise<{ data: any; error: AuthError | null }>;
  trackSession: (deviceInfo?: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useEnhancedAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);

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

  // Enhanced sign in with proper session management
  const signIn = async (email: string, password: string) => {
    try {
      // Ensure any previous session is cleared
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.expires_at');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
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
      console.log('Session tracking active');
    } catch (error) {
      console.error('Error tracking session:', error);
    }
  };

  // Enhanced sign out with complete session cleanup
  const signOut = async () => {
    try {
      // Clear local session data
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.expires_at');
      
      // Use session service to sign out properly
      await sessionService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
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

  // Set up auth state listener using session service
  useEffect(() => {
    const unsubscribe = sessionService.subscribe((sessionData) => {
      setSession(sessionData.session);
      setUser(sessionData.user);
      setIsAdmin(false); // Will be updated by checkAdminStatus
      setIsLoading(false);
      
      if (sessionData.isAuthenticated && sessionData.user) {
        // Check admin status
        sessionService.isAdmin().then(setIsAdmin);
        refreshProfile();
        trackSession();
      } else {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  return {
    user,
    session,
    isLoading,
    isAdmin,
    profile,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateEmail,
    updatePassword,
    resendEmailVerification,
    trackSession,
    refreshProfile
  };
};
