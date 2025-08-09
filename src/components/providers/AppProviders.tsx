
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { TenantContextProvider } from '@/contexts/TenantContextProvider';
import { Toaster } from 'sonner';

// Create a single, optimized query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
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

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <TenantContextProvider>
            {children}
            <Toaster position="top-right" />
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </TenantContextProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
