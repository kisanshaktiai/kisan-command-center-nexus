
import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { SplashScreen } from './components/SplashScreen';
import { AppProviders } from './components/providers/AppProviders';

// Lazy load pages for better performance
const Index = React.lazy(() => import('./pages/Index'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Register = React.lazy(() => import('./pages/Register'));
const OnboardPartner = React.lazy(() => import('./pages/OnboardPartner'));
const AdminRegister = React.lazy(() => import('./pages/AdminRegister'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Auth Components
const AuthCallback = React.lazy(() => import('./pages/auth/AuthCallback'));
const ResetPassword = React.lazy(() => import('./pages/auth/ResetPassword'));

// Super Admin Pages
const OptimizedOverview = React.lazy(() => import('./pages/super-admin/OptimizedOverview'));
const TenantManagementRefactored = React.lazy(() => import('./pages/super-admin/TenantManagementRefactored'));
const TenantOnboarding = React.lazy(() => import('./pages/super-admin/TenantOnboarding'));
const TenantOnboardingEnhanced = React.lazy(() => import('./pages/super-admin/TenantOnboardingEnhanced'));
const AdminUserManagement = React.lazy(() => import('./pages/super-admin/AdminUserManagement'));
const LeadManagement = React.lazy(() => import('./pages/super-admin/LeadManagement'));
const BillingManagement = React.lazy(() => import('./pages/super-admin/BillingManagement'));
const SubscriptionManagement = React.lazy(() => import('./pages/super-admin/SubscriptionManagement'));
const PlatformMonitoring = React.lazy(() => import('./pages/super-admin/PlatformMonitoring'));
const FeatureFlags = React.lazy(() => import('./pages/super-admin/FeatureFlags'));
const WhiteLabelConfig = React.lazy(() => import('./pages/super-admin/WhiteLabelConfig'));

// Protected Route Component
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  const [splashComplete, setSplashComplete] = useState(false);

  const handleSplashComplete = () => {
    setSplashComplete(true);
  };

  return (
    <AppProviders>
      <Router>
        <Suspense fallback={<SplashScreen onComplete={handleSplashComplete} />}>
          <Toaster position="top-right" />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/onboard-partner" element={<OnboardPartner />} />
            <Route path="/admin-register" element={<AdminRegister />} />

            {/* Protected Super Admin Routes */}
            <Route 
              path="/super-admin" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <OptimizedOverview />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/tenant-management" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <TenantManagementRefactored />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/tenant-onboarding" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <TenantOnboarding />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/enhanced-onboarding" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <TenantOnboardingEnhanced />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/admin-users" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <AdminUserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/leads" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <LeadManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/billing" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <BillingManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/subscriptions" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <SubscriptionManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/monitoring" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <PlatformMonitoring />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/feature-flags" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <FeatureFlags />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/white-label" 
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <WhiteLabelConfig />
                </ProtectedRoute>
              } 
            />

            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AppProviders>
  );
}

export default App;
