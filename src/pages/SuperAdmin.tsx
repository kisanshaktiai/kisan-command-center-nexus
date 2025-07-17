
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminAuth from '@/components/super-admin/SuperAdminAuth';
import SuperAdminHeader from '@/components/super-admin/SuperAdminHeader';
import SuperAdminSidebar from '@/components/super-admin/SuperAdminSidebar';
import Overview from '@/pages/super-admin/Overview';
import TenantManagement from '@/pages/super-admin/TenantManagement';
import TenantOnboarding from '@/pages/super-admin/TenantOnboarding';
import WhiteLabelConfig from '@/pages/super-admin/WhiteLabelConfig';
import SubscriptionManagement from '@/pages/super-admin/SubscriptionManagement';
import FeatureFlags from '@/pages/super-admin/FeatureFlags';
import { Toaster } from "@/components/ui/sonner";

export default function SuperAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated as super admin
    const superAdminAuth = localStorage.getItem('super_admin_authenticated');
    if (superAdminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('super_admin_authenticated');
    setIsAuthenticated(false);
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <SuperAdminAuth onAuthenticated={() => setIsAuthenticated(true)} />
        <Toaster />
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview />;
      case 'tenant-management':
        return <TenantManagement />;
      case 'tenant-onboarding':
        return <TenantOnboarding />;
      case 'white-label-config':
        return <WhiteLabelConfig />;
      case 'subscription-management':
        return <SubscriptionManagement />;
      case 'feature-flags':
        return <FeatureFlags />;
      case 'analytics':
        return <div className="p-6"><h1 className="text-2xl font-bold">Platform Analytics</h1><p>Coming soon...</p></div>;
      case 'notifications':
        return <div className="p-6"><h1 className="text-2xl font-bold">Notifications</h1><p>Coming soon...</p></div>;
      case 'reports':
        return <div className="p-6"><h1 className="text-2xl font-bold">Reports</h1><p>Coming soon...</p></div>;
      case 'integrations':
        return <div className="p-6"><h1 className="text-2xl font-bold">Integrations</h1><p>Coming soon...</p></div>;
      case 'system-health':
        return <div className="p-6"><h1 className="text-2xl font-bold">System Health</h1><p>Coming soon...</p></div>;
      case 'security':
        return <div className="p-6"><h1 className="text-2xl font-bold">Security</h1><p>Coming soon...</p></div>;
      case 'global-settings':
        return <div className="p-6"><h1 className="text-2xl font-bold">Global Settings</h1><p>Coming soon...</p></div>;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SuperAdminHeader onLogout={handleLogout} />
      
      <div className="flex">
        <aside className="w-80 border-r bg-muted/10">
          <SuperAdminSidebar 
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </aside>
        
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {renderActiveSection()}
          </div>
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}
