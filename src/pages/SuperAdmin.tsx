
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import Overview from './super-admin/Overview';
import TenantManagement from './super-admin/TenantManagement';
import TenantOnboarding from './super-admin/TenantOnboarding';
import SubscriptionManagement from './super-admin/SubscriptionManagement';
import BillingManagement from './super-admin/BillingManagement';
import FeatureFlags from './super-admin/FeatureFlags';
import WhiteLabelConfig from './super-admin/WhiteLabelConfig';
import PlatformMonitoring from './super-admin/PlatformMonitoring';

export default function SuperAdmin() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminUser = {
    full_name: user?.user_metadata?.full_name || 'Super Admin',
    email: user?.email || 'admin@example.com',
    role: 'super_admin',
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100">
        <SuperAdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col">
          <SuperAdminHeader 
            setSidebarOpen={setSidebarOpen} 
            adminUser={adminUser} 
            sidebarOpen={sidebarOpen}
          />
          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/tenants" element={<TenantManagement />} />
              <Route path="/onboarding" element={<TenantOnboarding />} />
              <Route path="/subscriptions" element={<SubscriptionManagement />} />
              <Route path="/billing" element={<BillingManagement />} />
              <Route path="/features" element={<FeatureFlags />} />
              <Route path="/white-label" element={<WhiteLabelConfig />} />
              <Route path="/monitoring" element={<PlatformMonitoring />} />
            </Routes>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
