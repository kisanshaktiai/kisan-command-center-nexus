
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthProvider';
import { TenantAuthProvider } from '@/contexts/TenantAuthProvider';
import { Toaster } from '@/components/ui/sonner';
import TenantManagement from '@/pages/super-admin/TenantManagement';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantAuthProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/" element={<Navigate to="/super-admin/tenant-management" replace />} />
                <Route path="/super-admin/tenant-management" element={<TenantManagement />} />
                <Route path="*" element={<Navigate to="/super-admin/tenant-management" replace />} />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </TenantAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
