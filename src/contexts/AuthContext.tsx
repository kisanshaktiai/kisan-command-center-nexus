
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
      console.log('checkAdminStatus: Checking admin status for email:', user.email);
      
      // Check if user exists in admin_users table with super_admin role and is active
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('id, email, role, is_active, full_name')
        .eq('email', user.email)
        .eq('role', 'super_admin')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('checkAdminStatus: Error querying admin_users:', error);
        setIsAdmin(false);
        return false;
      }

      const adminStatus = !!adminUser;
      console.log('checkAdminStatus: Admin user found:', adminUser);
      console.log('checkAdminStatus: Final admin status:', adminStatus);
      
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
      
      // Clear local storage
      localStorage.removeItem('admin_session_token');
      localStorage.removeItem('admin_session_info');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to defer admin check and avoid blocking the auth state change
          setTimeout(async () => {
            try {
              await checkAdminStatus();
            } catch (error) {
              console.error('Error checking admin status:', error);
              setIsAdmin(false);
            } finally {
              setIsLoading(false);
            }
          }, 0);
        } else {
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to defer admin check and avoid blocking
        setTimeout(async () => {
          try {
            await checkAdminStatus();
          } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          } finally {
            setIsLoading(false);
          }
        }, 0);
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Re-run admin check when user changes
  useEffect(() => {
    if (user?.email) {
      setTimeout(() => {
        checkAdminStatus();
      }, 0);
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
