
import React, { createContext, useContext } from 'react';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';

// Simplified AuthContext - just provides the hook result
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
  try {
    const auth = useEnhancedAuth();

    console.log('AuthProvider rendering with auth state:', {
      user: auth.user?.id,
      isLoading: auth.isLoading,
      isAdmin: auth.isAdmin
    });

    if (auth.isLoading) {
      console.log('AuthProvider: Still loading, showing loading state');
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <div>Loading...</div>
          </div>
        </div>
      );
    }

    return (
      <AuthContext.Provider value={auth}>
        {children}
      </AuthContext.Provider>
    );
  } catch (error) {
    console.error('AuthProvider error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <div>Authentication Error</div>
          <div className="text-sm mt-2">Please refresh the page</div>
        </div>
      </div>
    );
  }
};
