
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check admin status after setting session
          setTimeout(async () => {
            await checkAdminStatus(session.user);
          }, 0);
        } else {
          setIsAdmin(false);
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
        }, 0);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (user: User) => {
    try {
      // Use raw SQL query to check the super_admin.admin_users table
      const { data: adminUser, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT role, is_active 
          FROM super_admin.admin_users 
          WHERE id = $1 AND is_active = true
        `,
        params: [user.id]
      });

      if (!error && adminUser && adminUser.length > 0) {
        setIsAdmin(true);
        console.log('User is admin with role:', adminUser[0].role);
      } else {
        // Fallback: check by email since we might not have the user.id in the table yet
        const { data: adminUserByEmail, error: emailError } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT role, is_active 
            FROM super_admin.admin_users 
            WHERE email = $1 AND is_active = true
          `,
          params: [user.email]
        });

        if (!emailError && adminUserByEmail && adminUserByEmail.length > 0) {
          setIsAdmin(true);
          console.log('User is admin with role:', adminUserByEmail[0].role);
        } else {
          setIsAdmin(false);
          console.log('User is not an admin');
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    isLoading,
    isAdmin,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
