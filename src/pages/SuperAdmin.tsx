import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import SuperAdminSidebar from '@/components/super-admin/SuperAdminSidebar';
import Overview from '@/pages/super-admin/Overview';
import TenantManagement from '@/pages/super-admin/TenantManagement';
import TenantOnboarding from '@/pages/super-admin/TenantOnboarding';
import WhiteLabelConfig from '@/pages/super-admin/WhiteLabelConfig';
import SubscriptionManagement from '@/pages/super-admin/SubscriptionManagement';
import FeatureFlags from '@/pages/super-admin/FeatureFlags';
import { Toaster } from "@/components/ui/sonner";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PlatformMonitoring from '@/pages/super-admin/PlatformMonitoring';

export default function SuperAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email?.includes('admin')) {
        setIsAuthenticated(true);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email?.includes('admin')) {
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Mock admin user data
  const adminUser = {
    full_name: 'Super Admin',
    email: 'admin@kisanshaktiai.com',
    role: 'super_admin'
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <SuperAdminAuth />
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
      case 'platform-monitoring':
        return <PlatformMonitoring />;
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
      <SuperAdminHeader 
        setSidebarOpen={setSidebarOpen}
        adminUser={adminUser}
      />
      
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
