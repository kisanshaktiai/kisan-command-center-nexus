
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantContextProvider } from '@/contexts/TenantContextProvider';
import { Toaster } from 'sonner';

// Create optimized query client with performance settings
const createOptimizedQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Only retry on network errors
          if (failureCount < 3 && error instanceof Error) {
            return error.message.includes('network') || error.message.includes('fetch');
          }
          return false;
        },
      },
      mutations: {
        retry: 1,
      },
    },
  });
};

interface AppProvidersProps {
  children: React.ReactNode;
}

// Create query client outside of component to avoid recreation
const queryClient = createOptimizedQueryClient();

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantContextProvider>
          {children}
          <Toaster position="top-right" />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </TenantContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
