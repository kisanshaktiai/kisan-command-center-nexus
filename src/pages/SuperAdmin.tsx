
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import Overview from './super-admin/Overview';
import TenantManagement from './super-admin/TenantManagement';
import TenantOnboarding from './super-admin/TenantOnboarding';
import AdminManagement from './super-admin/AdminManagement';
import SubscriptionManagement from './super-admin/SubscriptionManagement';
import BillingManagement from './super-admin/BillingManagement';
import FeatureFlags from './super-admin/FeatureFlags';
import WhiteLabelConfig from './super-admin/WhiteLabelConfig';
import PlatformMonitoring from './super-admin/PlatformMonitoring';

export default function SuperAdmin() {
  return (
    <div className="min-h-screen flex flex-col">
      <SuperAdminHeader />
      <div className="flex-1 flex">
        <SuperAdminSidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/tenants" element={<TenantManagement />} />
            <Route path="/tenant-onboarding" element={<TenantOnboarding />} />
            <Route path="/admin-management" element={<AdminManagement />} />
            <Route path="/subscriptions" element={<SubscriptionManagement />} />
            <Route path="/billing" element={<BillingManagement />} />
            <Route path="/feature-flags" element={<FeatureFlags />} />
            <Route path="/white-label" element={<WhiteLabelConfig />} />
            <Route path="/monitoring" element={<PlatformMonitoring />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
