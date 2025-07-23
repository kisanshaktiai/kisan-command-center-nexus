
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Overview from './super-admin/Overview';
import TenantManagement from './super-admin/TenantManagement';
import TenantOnboarding from './super-admin/TenantOnboarding';
import SubscriptionManagement from './super-admin/SubscriptionManagement';
import BillingManagement from './super-admin/BillingManagement';
import FeatureFlags from './super-admin/FeatureFlags';
import WhiteLabelConfig from './super-admin/WhiteLabelConfig';
import PlatformMonitoring from './super-admin/PlatformMonitoring';

export default function SuperAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Create a default admin user object since we don't need actual user data
  const adminUser = {
    full_name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
  };

  return (
    <ProtectedRoute>
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
