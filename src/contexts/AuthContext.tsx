
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { sessionService } from '@/services/SessionService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider initializing...');
    
    // Subscribe to session changes
    const unsubscribe = sessionService.subscribe((sessionData) => {
      console.log('Session data updated:', {
        email: sessionData.user?.email,
        isAuthenticated: sessionData.isAuthenticated,
        profile: sessionData.profile
      });
      
      setUser(sessionData.user);
      setSession(sessionData.session);
      setProfile(sessionData.profile);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    await sessionService.signOut();
    // Loading state will be updated via session subscriber
  };

  const refreshSession = async () => {
    await sessionService.refreshSession();
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
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
