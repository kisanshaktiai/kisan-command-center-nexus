
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import Overview from './super-admin/Overview';
import TenantManagement from './super-admin/TenantManagement';
import TenantOnboarding from './super-admin/TenantOnboarding';
import SubscriptionManagement from './super-admin/SubscriptionManagement';
import BillingManagement from './super-admin/BillingManagement';
import FeatureFlags from './super-admin/FeatureFlags';
import WhiteLabelConfig from './super-admin/WhiteLabelConfig';
import PlatformMonitoring from './super-admin/PlatformMonitoring';

export default function SuperAdmin() {
  return (
    <AppLayout>
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
    </AppLayout>
  );
}
