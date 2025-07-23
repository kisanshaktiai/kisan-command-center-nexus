
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { sessionService } from '@/services/SessionService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider initializing...');
    
    // Subscribe to session changes
    const unsubscribe = sessionService.subscribe((sessionData) => {
      console.log('Session data updated:', sessionData);
      setUser(sessionData.user);
      setSession(sessionData.session);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await sessionService.signOut();
  };

  const refreshSession = async () => {
    await sessionService.refreshSession();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      signOut,
      refreshSession
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
