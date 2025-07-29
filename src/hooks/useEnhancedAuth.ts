import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authenticationService } from '@/services/AuthenticationService';
import { AuthState, TenantData, UserProfile } from '@/types/auth';
import { toast } from 'sonner';

// Simplified auth hook with optimized event handling
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

// Admin status cache to prevent repeated database calls
interface AdminStatusCache {
  userId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
  timestamp: number;
}

let adminStatusCache: AdminStatusCache | null = null;
const ADMIN_CACHE_DURATION = 30000; // 30 seconds

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
  
  // Refs for optimization
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const lastAuthEventRef = useRef<string>('');
  const mountedRef = useRef(true);

  // Get cached admin status or fetch new
  const getAdminStatus = useCallback(async (userId: string) => {
    const now = Date.now();
    
    // Return cached result if valid and for same user
    if (adminStatusCache && 
        adminStatusCache.userId === userId && 
        (now - adminStatusCache.timestamp) < ADMIN_CACHE_DURATION) {
      console.log('Enhanced Auth: Using cached admin status');
      return {
        isAdmin: adminStatusCache.isAdmin,
        isSuperAdmin: adminStatusCache.isSuperAdmin,
        adminRole: adminStatusCache.adminRole
      };
    }

    try {
      const currentAuthState = await authenticationService.getCurrentAuthState();
      
      // Cache the result
      adminStatusCache = {
        userId,
        isAdmin: currentAuthState.isAdmin,
        isSuperAdmin: currentAuthState.isSuperAdmin,
        adminRole: currentAuthState.adminRole,
        timestamp: now
      };

      return {
        isAdmin: currentAuthState.isAdmin,
        isSuperAdmin: currentAuthState.isSuperAdmin,
        adminRole: currentAuthState.adminRole
      };
    } catch (error) {
      console.error('Enhanced Auth: Error getting admin status:', error);
      return { isAdmin: false, isSuperAdmin: false, adminRole: null };
    }
  }, []);

  // Smart loading state management
  const setLoadingState = useCallback((loading: boolean, reason?: string) => {
    if (!mountedRef.current) return;
    
    console.log(`Enhanced Auth: Setting loading to ${loading}`, reason ? `- ${reason}` : '');
    setIsLoading(loading);
  }, []);

  // Debounced auth state update
  const updateAuthState = useCallback(async (session: Session | null, skipLoading = false) => {
    if (!mountedRef.current) return;

    // Clear existing debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Don't show loading for quick session updates or when specifically skipped
    if (!skipLoading) {
      setLoadingState(true, 'auth state update');
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;

      try {
        if (session?.user) {
          console.log('Enhanced Auth: Processing authenticated user');
          
          // Get admin status (cached or fresh)
          const adminStatus = await getAdminStatus(session.user.id);
          
          const newAuthState: AuthState = {
            user: session.user,
            session,
            isAuthenticated: true,
            isAdmin: adminStatus.isAdmin,
            isSuperAdmin: adminStatus.isSuperAdmin,
            adminRole: adminStatus.adminRole,
            profile: null // Will be fetched separately if needed
          };

          if (mountedRef.current) {
            setAuthState(newAuthState);
          }
        } else {
          console.log('Enhanced Auth: No authenticated user');
          if (mountedRef.current) {
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
        }
      } catch (error) {
        console.error('Enhanced Auth: Error updating auth state:', error);
        // Fallback to basic session data
        if (session?.user && mountedRef.current) {
          setAuthState({
            user: session.user,
            session,
            isAuthenticated: true,
            isAdmin: false,
            isSuperAdmin: false,
            adminRole: null,
            profile: null
          });
        }
      } finally {
        if (mountedRef.current) {
          setLoadingState(false, 'auth state update complete');
        }
      }
    }, 100); // 100ms debounce
  }, [getAdminStatus, setLoadingState]);

  // Page visibility handler for quick session restoration
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && authState.user) {
        console.log('Enhanced Auth: Page became visible, validating session...');
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user.id === authState.user.id) {
            // Session is still valid, update without loading screen
            await updateAuthState(session, true);
          }
        } catch (error) {
          console.error('Enhanced Auth: Error checking session on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [authState.user, updateAuthState]);

  // Initialize auth state with session recovery
  useEffect(() => {
    let subscription: any;
    
    const initializeAuth = async () => {
      try {
        console.log('Enhanced Auth: Starting initialization...');
        
        // Check for existing session first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Enhanced Auth: Session error:', error);
          setError('Failed to get session');
          setLoadingState(false, 'session error');
          return;
        }
        
        console.log('Enhanced Auth: Session retrieved:', session?.user?.id || 'No session');
        
        // Process initial session
        await updateAuthState(session);
        
        // Set up auth state listener for future changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mountedRef.current) return;
            
            // Avoid duplicate processing
            const eventKey = `${event}-${session?.user?.id || 'none'}`;
            if (lastAuthEventRef.current === eventKey) {
              console.log('Enhanced Auth: Skipping duplicate event:', eventKey);
              return;
            }
            lastAuthEventRef.current = eventKey;
            
            console.log('Enhanced Auth: Auth state change:', event, session?.user?.id);

            // Skip loading for token refresh events
            const shouldSkipLoading = event === 'TOKEN_REFRESHED';
            
            if (event === 'SIGNED_OUT') {
              // Clear admin cache on sign out
              adminStatusCache = null;
            }
            
            await updateAuthState(session, shouldSkipLoading);
          }
        );

        subscription = authSubscription;

      } catch (error) {
        console.error('Enhanced Auth: Initialization error:', error);
        if (mountedRef.current) {
          setError('Authentication initialization failed');
          setLoadingState(false, 'initialization error');
        }
      }
    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [updateAuthState, setLoadingState]);

  const signUp = async (email: string, password: string, tenantData: TenantData) => {
    try {
      setError(null);
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
    setLoadingState(true, 'admin login');
    setError(null);
    
    try {
      const result = await authenticationService.signInAdmin(email, password);
      
      if (result.success) {
        return { success: true, error: null };
      } else {
        setError(result.error || 'Authentication failed');
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoadingState(false, 'admin login complete');
    }
  };

  const signOut = async () => {
    setLoadingState(true, 'sign out');
    try {
      // Clear admin cache
      adminStatusCache = null;
      const result = await authenticationService.signOut();
      if (!result.success) {
        console.error('Sign out failed:', result.error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error during logout');
    }
  };

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
