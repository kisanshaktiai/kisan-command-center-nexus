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
      isAdmin: auth.isAdmin,
      isSuperAdmin: auth.isSuperAdmin
    });

    // Always render children with enhanced error recovery
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
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};
