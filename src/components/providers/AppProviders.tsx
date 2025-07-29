import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantBrandingProvider } from '@/components/auth/TenantBrandingProvider';
import { SessionMonitor } from '@/components/session/SessionMonitor';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * AppProviders Component
 * Centralized provider management with proper nesting order and error boundaries
 * 
 * Provider Order (outer to inner):
 * 1. ErrorBoundary - Catches all React errors
 * 2. QueryClientProvider - React Query for server state
 * 3. TooltipProvider - UI tooltips
 * 4. TenantBrandingProvider - Tenant-specific styling
 * 5. AuthProvider - Authentication state
 * 6. Application content
 */

interface AppProvidersProps {
  children: React.ReactNode;
}

// Create query client instance with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<CriticalErrorFallback />}
      context={{ component: 'AppProviders', level: 'critical' }}
    >
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary
          fallback={<QueryErrorFallback />}
          context={{ component: 'QueryProvider', level: 'high' }}
        >
          <TooltipProvider>
            <ErrorBoundary
              fallback={<UIErrorFallback />}
              context={{ component: 'UIProvider', level: 'medium' }}
            >
              <TenantBrandingProvider>
                <ErrorBoundary
                  fallback={<AuthErrorFallback />}
                  context={{ component: 'AuthProvider', level: 'high' }}
                >
                  <AuthProvider>
                    <div className="min-h-screen bg-background font-sans antialiased">
                      {/* Global UI components */}
                      <Toaster />
                      <SessionMonitor />
                      
                      {/* Application content */}
                      {children}
                    </div>
                  </AuthProvider>
                </ErrorBoundary>
              </TenantBrandingProvider>
            </ErrorBoundary>
          </TooltipProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

/**
 * Error Fallback Components
 * Different fallbacks for different provider levels
 */

const CriticalErrorFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-red-50">
    <div className="text-center p-8 max-w-md">
      <div className="text-red-600 text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-red-800 mb-4">
        Critical Application Error
      </h1>
      <p className="text-red-600 mb-6">
        The application encountered a critical error and cannot continue. 
        Please refresh the page or contact support if the problem persists.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

const QueryErrorFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-yellow-50">
    <div className="text-center p-8 max-w-md">
      <div className="text-yellow-600 text-4xl mb-4">🔄</div>
      <h2 className="text-xl font-semibold text-yellow-800 mb-4">
        Data Loading Error
      </h2>
      <p className="text-yellow-600 mb-6">
        Unable to load application data. This might be a temporary network issue.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

const UIErrorFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-blue-50">
    <div className="text-center p-8 max-w-md">
      <div className="text-blue-600 text-4xl mb-4">🎨</div>
      <h2 className="text-xl font-semibold text-blue-800 mb-4">
        UI Component Error
      </h2>
      <p className="text-blue-600 mb-6">
        There was an issue with the user interface. The application may still function with limited visual features.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
      >
        Refresh Interface
      </button>
    </div>
  </div>
);

const AuthErrorFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-purple-50">
    <div className="text-center p-8 max-w-md">
      <div className="text-purple-600 text-4xl mb-4">🔐</div>
      <h2 className="text-xl font-semibold text-purple-800 mb-4">
        Authentication Error
      </h2>
      <p className="text-purple-600 mb-6">
        There was an issue with the authentication system. You may need to log in again.
      </p>
      <div className="space-y-2">
        <button
          onClick={() => window.location.href = '/auth'}
          className="block w-full bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition-colors"
        >
          Go to Login
        </button>
        <button
          onClick={() => window.location.reload()}
          className="block w-full bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  </div>
);

export default AppProviders;