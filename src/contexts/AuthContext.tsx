
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async (): Promise<boolean> => {
    if (!user?.email) {
      console.log('checkAdminStatus: No user email available');
      setIsAdmin(false);
      return false;
    }

    try {
      console.log('checkAdminStatus: Checking admin status for:', user.email);
      
      // Check both user metadata and admin_users table
      const userRole = user.user_metadata?.role || user.app_metadata?.role;
      console.log('checkAdminStatus: User role from metadata:', userRole);
      
      // Also check admin_users table directly
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('role, is_active')
        .eq('email', user.email)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('checkAdminStatus: Error checking admin_users:', error);
        setIsAdmin(false);
        return false;
      }

      console.log('checkAdminStatus: Admin user data:', adminUser);

      const validAdminRoles = ['super_admin', 'platform_admin', 'admin'];
      const isAdminFromMetadata = userRole && validAdminRoles.includes(userRole);
      const isAdminFromTable = adminUser && validAdminRoles.includes(adminUser.role);
      
      // User is admin if either metadata or table indicates admin status
      const adminStatus = !!(isAdminFromMetadata || isAdminFromTable);
      
      console.log('checkAdminStatus: Final admin status:', adminStatus);
      console.log('checkAdminStatus: From metadata:', isAdminFromMetadata);
      console.log('checkAdminStatus: From table:', isAdminFromTable);
      
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.error('checkAdminStatus: Exception:', error);
      setIsAdmin(false);
      return false;
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      
      // Clear admin session data
      localStorage.removeItem('admin_session_token');
      localStorage.removeItem('admin_session_info');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      // Clear state
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      
      console.log('Sign out successful');
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check admin status when user signs in
          setTimeout(() => {
            checkAdminStatus();
          }, 0);
        } else {
          setIsAdmin(false);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          checkAdminStatus();
        }, 0);
      } else {
        setIsAdmin(false);
      }
      
      setIsLoading(false);
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Re-check admin status when user changes
  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user?.email]);

  const value = {
    user,
    session,
    isLoading,
    isAdmin,
    signOut,
    checkAdminStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
