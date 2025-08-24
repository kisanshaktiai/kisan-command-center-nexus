
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import Overview from './super-admin/Overview';
import TenantManagement from './super-admin/TenantManagement';
import LeadManagement from './super-admin/LeadManagement';
import TenantOnboarding from './super-admin/TenantOnboarding';
import AdminUserManagement from './super-admin/AdminUserManagement';
import BillingManagement from './super-admin/BillingManagement';
import SubscriptionManagement from './super-admin/SubscriptionManagement';
import PlatformMonitoring from './super-admin/PlatformMonitoring';
import FeatureFlags from './super-admin/FeatureFlags';
import WhiteLabelConfig from './super-admin/WhiteLabelConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const SuperAdmin = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { user, isLoading, isAdmin, isSuperAdmin } = useAuth();

  console.log('SuperAdmin: Render state:', { 
    user: user?.id, 
    isLoading, 
    isAdmin, 
    isSuperAdmin 
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary mr-2" />
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="text-lg font-semibold mb-2 text-foreground">
              Verifying Admin Access
            </div>
            <div className="text-sm text-muted-foreground">
              Checking your administrative privileges...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to auth if not authenticated or not admin
  if (!user || !isAdmin) {
    console.log('SuperAdmin: User not authenticated or not admin, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Show admin dashboard when authenticated and authorized
  console.log('SuperAdmin: Showing admin dashboard');
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'lg:ml-72' : 'lg:ml-16'
      }`}>
        <SuperAdminHeader 
          setSidebarOpen={setSidebarOpen}
          adminUser={{ 
            id: user.id, 
            email: user.email || '', 
            full_name: user.user_metadata?.full_name || 'Admin User',
            role: isSuperAdmin ? 'super_admin' : 'admin'
          }}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/super-admin/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/tenant-management" element={<TenantManagement />} />
            <Route path="/lead-management" element={<LeadManagement />} />
            <Route path="/tenant-onboarding" element={<TenantOnboarding />} />
            <Route path="/admin-user-management" element={<AdminUserManagement />} />
            <Route path="/billing-management" element={<BillingManagement />} />
            <Route path="/subscription-management" element={<SubscriptionManagement />} />
            <Route path="/platform-monitoring" element={<PlatformMonitoring />} />
            <Route path="/feature-flags" element={<FeatureFlags />} />
            <Route path="/white-label-config" element={<WhiteLabelConfig />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default SuperAdmin;
