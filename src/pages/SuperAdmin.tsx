
import React, { useState } from 'react';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import OptimizedOverview from '@/pages/super-admin/OptimizedOverview';
import TenantManagement from '@/pages/super-admin/TenantManagement';
import TenantOnboarding from '@/pages/super-admin/TenantOnboarding';
import PlatformMonitoring from '@/pages/super-admin/PlatformMonitoring';
import BillingManagement from '@/pages/super-admin/BillingManagement';
import SubscriptionManagement from '@/pages/super-admin/SubscriptionManagement';
import AdminUserManagement from '@/pages/super-admin/AdminUserManagement';
import WhiteLabelConfig from '@/pages/super-admin/WhiteLabelConfig';
import FeatureFlags from '@/pages/super-admin/FeatureFlags';

const SuperAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OptimizedOverview />;
      case 'tenants':
        return <TenantManagement />;
      case 'onboarding':
        return <TenantOnboarding />;
      case 'monitoring':
        return <PlatformMonitoring />;
      case 'billing':
        return <BillingManagement />;
      case 'subscriptions':
        return <SubscriptionManagement />;
      case 'admins':
        return <AdminUserManagement />;
      case 'white-label':
        return <WhiteLabelConfig />;
      case 'features':
        return <FeatureFlags />;
      default:
        return <OptimizedOverview />;
    }
  };

  return (
    <SuperAdminAuth>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <SuperAdminHeader />
        <div className="flex">
          <SuperAdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex-1 p-6">
            {renderActiveTab()}
          </main>
        </div>
      </div>
    </SuperAdminAuth>
  );
};

export default SuperAdmin;
