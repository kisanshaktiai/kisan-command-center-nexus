
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Optimized query client with performance settings
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

interface OptimizedQueryProviderProps {
  children: ReactNode;
}

export const OptimizedQueryProvider: React.FC<OptimizedQueryProviderProps> = ({ children }) => {
  const [queryClient] = React.useState(() => createOptimizedQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};
