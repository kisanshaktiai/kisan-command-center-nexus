
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import Overview from './super-admin/Overview';
import TenantManagement from './super-admin/TenantManagement';
import TenantOnboarding from './super-admin/TenantOnboarding';
import SubscriptionManagement from './super-admin/SubscriptionManagement';
import BillingManagement from './super-admin/BillingManagement';
import FeatureFlags from './super-admin/FeatureFlags';
import WhiteLabelConfig from './super-admin/WhiteLabelConfig';
import PlatformMonitoring from './super-admin/PlatformMonitoring';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function SuperAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock admin user for now
  const adminUser = {
    name: 'Super Admin',
    email: 'admin@example.com',
    avatar: '',
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SuperAdminSidebar />
        <div className="flex-1 flex flex-col">
          <SuperAdminHeader setSidebarOpen={setSidebarOpen} adminUser={adminUser} />
          <main className="flex-1 p-6 bg-gray-50">
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
    </SidebarProvider>
  );
}
