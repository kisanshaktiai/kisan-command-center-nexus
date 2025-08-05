
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import Index from './pages/Index';
import Auth from './pages/Auth';
import AuthCallback from './pages/auth/AuthCallback';
import Register from './pages/Register';
import AdminRegister from './pages/AdminRegister';
import SuperAdmin from './pages/SuperAdmin';
import NotFound from './pages/NotFound';
import OnboardPartner from './pages/OnboardPartner';
import ResetPassword from './pages/auth/ResetPassword';
import LeadManagementPage from './pages/super-admin/LeadManagement';
import AdminManagementPage from './pages/super-admin/AdminUserManagement';

// Import the new activation page
import ActivateAccount from '@/pages/auth/ActivateAccount';

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background font-sans antialiased">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/activate" element={<ActivateAccount />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-register" element={<AdminRegister />} />
            <Route path="/onboard-partner" element={<OnboardPartner />} />
            <Route path="/super-admin/*" element={<SuperAdmin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
