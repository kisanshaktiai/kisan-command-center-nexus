
import { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Tenant-aware query client with enhanced retry logic and offline support
const createOptimizedQueryClient = (tenantId: string | null) => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Don't retry if offline
          if (!navigator.onLine) return false;
          
          // Limit retry attempts
          if (failureCount >= 3) return false;
          
          // Enhanced error classification for better retry logic
          if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            const isNetworkError = /(network|fetch|timeout|econnreset|connection|refused)/i.test(errorMessage);
            const isHttpError = error.name === 'HttpError';
            
            // Retry on network errors and certain HTTP errors
            if (isNetworkError) return true;
            
            // For HTTP errors, check status codes if available
            if (isHttpError && 'status' in error) {
              const status = (error as any).status;
              // Retry on 5xx server errors and 408 timeout
              return status >= 500 || status === 408 || status === 429;
            }
          }
          
          return false;
        },
        // Tenant-aware query key hashing to prevent cross-tenant state leakage
        queryKeyHashFn: (queryKey) => {
          const tenantPrefix = tenantId ? `tenant:${tenantId}` : 'no-tenant';
          return JSON.stringify([tenantPrefix, ...queryKey]);
        },
      },
      mutations: {
        retry: (failureCount, error) => {
          // Similar retry logic for mutations but more conservative
          if (!navigator.onLine) return false;
          if (failureCount >= 1) return false;
          
          if (error instanceof Error) {
            const isNetworkError = /(network|fetch|timeout|econnreset)/i.test(error.message);
            return isNetworkError;
          }
          
          return false;
        },
      },
    },
  });
};

interface OptimizedQueryProviderProps {
  children: ReactNode;
}

export const OptimizedQueryProvider = ({ children }: OptimizedQueryProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const tenantId = user?.id || null; // Using user ID as tenant identifier
  
  const [queryClient] = useState(() => createOptimizedQueryClient(tenantId));

  // Setup offline persistence with tenant-aware storage
  useEffect(() => {
    if (isAuthenticated && tenantId) {
      const storageKey = `react-query-cache-${tenantId}`;
      
      try {
        const persister = createSyncStoragePersister({
          storage: window.localStorage,
          key: storageKey,
        });

        persistQueryClient({
          queryClient,
          persister,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          buster: tenantId, // Bust cache when tenant changes
        });

        console.log('Query persistence initialized for tenant:', tenantId);
      } catch (error) {
        console.warn('Failed to initialize query persistence:', error);
        // Gracefully degrade - app still works without persistence
      }
    }
  }, [queryClient, tenantId, isAuthenticated]);

  // Error handler for query errors
  const handleQueryError = (error: Error, errorInfo: { componentStack: string }) => {
    console.error('Query Error:', error, errorInfo);
    
    // Show user-friendly error message
    toast.error('Something went wrong loading data. Please try again.', {
      action: {
        label: 'Retry',
        onClick: () => window.location.reload(),
      },
    });
  };

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <QueryClientProvider client={queryClient}>
          {children}
          {import.meta.env.DEV && (
            <ReactQueryDevtools 
              initialIsOpen={false}
              buttonPosition="bottom-left"
            />
          )}
        </QueryClientProvider>
      )}
    </QueryErrorResetBoundary>
  );
};
