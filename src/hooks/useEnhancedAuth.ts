
import { useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // Check if user has admin role based on metadata with enhanced checking
  const checkAdminStatus = (user: User | null): boolean => {
    if (!user) {
      console.log('checkAdminStatus: No user provided');
      return false;
    }
    
    // Check both user_metadata and app_metadata for role
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    console.log('checkAdminStatus: User role found:', userRole);
    console.log('checkAdminStatus: User metadata:', user.user_metadata);
    console.log('checkAdminStatus: App metadata:', user.app_metadata);
    
    // Valid admin roles
    const validAdminRoles = ['super_admin', 'platform_admin', 'admin'];
    const isUserAdmin = validAdminRoles.includes(userRole);
    console.log('checkAdminStatus: Is admin?', isUserAdmin);
    
    return isUserAdmin;
  };

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
            phone: tenantData.phone,
            role: 'user' // Default role for new signups
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
      console.log('Session tracking active for user:', user?.email);
    } catch (error) {
      console.error('Error tracking session:', error);
    }
  };

  // Sign out with session cleanup
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setProfile(null);
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  // Refresh user profile
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      // Set profile from user metadata
      setProfile({
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        email: user.email,
        role: user.user_metadata?.role || user.app_metadata?.role || 'user'
      });
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  // Set up auth state listener with improved handling
  useEffect(() => {
    console.log('useEnhancedAuth: Setting up auth state listener');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        if (session?.user) {
          const adminStatus = checkAdminStatus(session.user);
          setIsAdmin(adminStatus);
          console.log('User admin status:', adminStatus);
          
          // Set profile from user metadata
          setProfile({
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
            email: session.user.email,
            role: session.user.user_metadata?.role || session.user.app_metadata?.role || 'user'
          });
        } else {
          setIsAdmin(false);
          setProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('useEnhancedAuth: Checking existing session:', session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (session?.user) {
        const adminStatus = checkAdminStatus(session.user);
        setIsAdmin(adminStatus);
        
        setProfile({
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
          email: session.user.email,
          role: session.user.user_metadata?.role || session.user.app_metadata?.role || 'user'
        });
      }
    });

    return () => subscription.unsubscribe();
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
