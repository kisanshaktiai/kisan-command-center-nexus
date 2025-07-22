
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
    if (!user?.id) {
      console.log('checkAdminStatus: No user ID available');
      setIsAdmin(false);
      return false;
    }

    try {
      console.log('checkAdminStatus: Checking for user ID:', user.id);
      
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('id, email, role, is_active')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.log('checkAdminStatus: Query error:', error.message);
        setIsAdmin(false);
        return false;
      }

      const adminStatus = !!adminUser && adminUser.role === 'super_admin';
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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email || 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check admin status for authenticated user
        checkAdminStatus().finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'No session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check admin status for authenticated user
          setTimeout(async () => {
            try {
              await checkAdminStatus();
            } catch (error) {
              console.error('Error checking admin status:', error);
              setIsAdmin(false);
            }
          }, 100);
        } else {
          setIsAdmin(false);
        }
        
        if (!session) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      console.log('AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Re-check admin status when user changes
  useEffect(() => {
    if (user?.id && session) {
      checkAdminStatus();
    }
  }, [user?.id]);

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
