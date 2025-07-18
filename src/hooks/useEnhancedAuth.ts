
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

  // Enhanced sign up with tenant metadata
  const signUp = async (email: string, password: string, tenantData: TenantData) => {
    try {
      // Check if account is locked
      const { data: isLocked } = await supabase.rpc('is_account_locked', { user_email: email });
      if (isLocked) {
        throw new Error('Account is temporarily locked due to multiple failed login attempts. Please try again later.');
      }

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

      // Track email verification
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.from('email_verifications').insert({
          user_id: data.user.id,
          email: email,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          tenant_id: tenantData.tenantId,
          verification_type: 'signup'
        });
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  // Enhanced sign in with security tracking
  const signIn = async (email: string, password: string) => {
    try {
      // Check if account is locked
      const { data: isLocked } = await supabase.rpc('is_account_locked', { user_email: email });
      if (isLocked) {
        throw new Error('Account is temporarily locked due to multiple failed login attempts. Please try again later.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Track failed login attempt
        await supabase.rpc('track_failed_login', { user_email: email });
        throw error;
      }

      if (data.user) {
        // Track successful login
        await supabase.rpc('track_user_login', { user_id: data.user.id });
        
        // Track session
        await trackSession();
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  // Enhanced password reset with tenant-specific redirects
  const resetPassword = async (email: string, tenantId?: string) => {
    try {
      const redirectUrl = tenantId 
        ? `${window.location.origin}/auth/reset-password?tenant=${tenantId}`
        : `${window.location.origin}/auth/reset-password`;
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (!error) {
        // Track password reset request
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase.from('password_reset_requests').insert({
            user_id: userData.user.id,
            email: email,
            token: crypto.randomUUID(),
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
            tenant_id: tenantId
          });
        }
      }

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

      if (!error && data.user) {
        // Track email change verification
        await supabase.from('email_verifications').insert({
          user_id: data.user.id,
          email: newEmail,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          verification_type: 'email_change'
        });
      }

      return { data, error };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  };

  // Update password with tracking
  const updatePassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (!error && data.user) {
        // Update password changed timestamp
        await supabase.from('user_profiles')
          .update({ password_changed_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }

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

  // Track user session with device info
  const trackSession = async (deviceInfo?: any) => {
    try {
      if (!session) return;

      const sessionData = {
        user_id: session.user.id,
        session_id: session.access_token.substring(0, 32), // Use part of token as session ID
        device_info: deviceInfo || {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        user_agent: navigator.userAgent,
        expires_at: new Date(session.expires_at! * 1000).toISOString()
      };

      await supabase.from('user_sessions').upsert(sessionData, {
        onConflict: 'session_id'
      });
    } catch (error) {
      console.error('Error tracking session:', error);
    }
  };

  // Sign out with session cleanup
  const signOut = async () => {
    try {
      if (session) {
        // Clean up session tracking
        await supabase.from('user_sessions')
          .update({ is_active: false })
          .eq('session_id', session.access_token.substring(0, 32));
      }
      
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Refresh user profile
  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  // Check admin status
  const checkAdminStatus = async (user: User) => {
    try {
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('email', user.email)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!adminUser);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(async () => {
            await checkAdminStatus(session.user);
            await refreshProfile();
            
            if (event === 'SIGNED_IN') {
              await trackSession();
            }
          }, 0);
        } else {
          setIsAdmin(false);
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          await checkAdminStatus(session.user);
          await refreshProfile();
        }, 0);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Session activity tracking
  useEffect(() => {
    if (!session) return;

    const updateActivity = async () => {
      try {
        await supabase.from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('session_id', session.access_token.substring(0, 32));
      } catch (error) {
        console.error('Error updating session activity:', error);
      }
    };

    // Update activity every 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000);
    
    // Update activity on user interaction
    const handleActivity = () => updateActivity();
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [session]);

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
