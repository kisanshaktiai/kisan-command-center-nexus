
import React, { createContext, useContext } from 'react';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';

const AuthContext = createContext<ReturnType<typeof useEnhancedAuth> | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth called outside AuthProvider context');
    console.trace('Call stack:');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useEnhancedAuth();

  // Add debugging to see when provider is rendering
  console.log('AuthProvider rendering with auth state:', {
    user: auth.user?.id,
    isLoading: auth.isLoading,
    isAdmin: auth.isAdmin
  });

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};
