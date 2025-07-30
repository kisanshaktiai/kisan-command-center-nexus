
import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { unifiedAuthService } from '@/lib/services/unifiedAuthService';

// Create context that provides the auth store
const AuthContext = createContext<ReturnType<typeof useAuthStore> | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth called outside AuthProvider context');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authStore = useAuthStore();

  useEffect(() => {
    // Initialize the unified auth service
    unifiedAuthService.initialize();
  }, []);

  // Enhanced error recovery
  if (authStore.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600 max-w-md">
          <div className="text-lg font-semibold mb-2">Authentication Error</div>
          <div className="text-sm mb-4">{authStore.error}</div>
          <div className="space-x-2">
            <button 
              onClick={() => authStore.clearError()} 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authStore}>
      {children}
    </AuthContext.Provider>
  );
};
