
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantContextProvider } from '@/contexts/TenantContextProvider';
import { TenantProvider } from '@/hooks/useTenant';
import { OptimizedQueryProvider } from '@/core/providers/OptimizedQueryProvider';
import { Toaster } from 'sonner';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <OptimizedQueryProvider>
      <AuthProvider>
        <TenantProvider>
          <TenantContextProvider>
            {children}
            <Toaster position="top-right" />
          </TenantContextProvider>
        </TenantProvider>
      </AuthProvider>
    </OptimizedQueryProvider>
  );
};
