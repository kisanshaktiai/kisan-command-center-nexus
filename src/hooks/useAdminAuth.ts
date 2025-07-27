
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '@/services/AuthService';
import { securityService } from '@/services/SecurityService';
import { toast } from 'sonner';

interface AdminAuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: string | null;
  error: string | null;
}

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAdmin: false,
    isSuperAdmin: false,
    adminRole: null,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          const [isAdmin, isSuperAdmin, adminRole] = await Promise.all([
            securityService.isCurrentUserAdmin(),
            securityService.isCurrentUserSuperAdmin(),
            securityService.getCurrentAdminRole()
          ]);

          if (mounted) {
            setState({
              user: session.user,
              session,
              isLoading: false,
              isAdmin,
              isSuperAdmin,
              adminRole,
              error: null
            });
          }
        } else {
          if (mounted) {
            setState(prev => ({
              ...prev,
              isLoading: false
            }));
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Failed to initialize authentication'
          }));
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAdmin: false,
            isSuperAdmin: false,
            adminRole: null,
            error: null
          });
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          try {
            const [isAdmin, isSuperAdmin, adminRole] = await Promise.all([
              securityService.isCurrentUserAdmin(),
              securityService.isCurrentUserSuperAdmin(),
              securityService.getCurrentAdminRole()
            ]);

            setState({
              user: session.user,
              session,
              isLoading: false,
              isAdmin,
              isSuperAdmin,
              adminRole,
              error: null
            });
          } catch (error) {
            console.error('Error checking admin status:', error);
            setState(prev => ({
              ...prev,
              user: session.user,
              session,
              isLoading: false,
              error: 'Failed to verify admin status'
            }));
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await authService.authenticateAdmin(email, password);
      
      if (result.error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error?.message || 'Authentication failed'
        }));
        return { success: false, error: result.error };
      }

      setState({
        user: result.user,
        session: result.session,
        isLoading: false,
        isAdmin: result.isAdmin,
        isSuperAdmin: result.isSuperAdmin,
        adminRole: result.adminRole,
        error: null
      });

      return { success: true, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await authService.logout();
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return {
    ...state,
    signIn,
    signOut,
    clearError
  };
};
