
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
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const SuperAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, isLoading, isAdmin } = useAuth();

  console.log('SuperAdmin: Render state:', {
    user: user?.id,
    isLoading,
    isAdmin
  });

  // Show loading state only briefly while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect non-authenticated users to auth page
  if (!user) {
    console.log('SuperAdmin: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Redirect non-admin users to auth page
  if (!isAdmin) {
    console.log('SuperAdmin: User is not admin, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Create admin user data from auth user
  const adminUser = {
    id: user?.id || '',
    email: user?.email || '',
    full_name: user?.user_metadata?.full_name || 'Super Admin',
    role: 'super_admin'
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <SuperAdminHeader 
        setSidebarOpen={setSidebarOpen}
        adminUser={adminUser}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex">
        <SuperAdminSidebar 
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <main className="flex-1 p-6">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

export default SuperAdmin;
