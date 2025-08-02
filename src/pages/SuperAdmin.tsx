
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import Overview from './super-admin/Overview';
import TenantManagement from './super-admin/TenantManagement';
import LeadManagement from './super-admin/LeadManagement';
import AdminUserManagement from './super-admin/AdminUserManagement';
import BillingManagement from './super-admin/BillingManagement';
import PlatformMonitoring from './super-admin/PlatformMonitoring';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SuperAdmin = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Get current admin user data
  const { data: adminUser } = useQuery({
    queryKey: ['current-admin-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) throw error;
      return adminData;
    },
  });

  if (!adminUser) {
    return <div>Loading...</div>;
  }

  return (
    <SuperAdminAuth>
      <div className="min-h-screen bg-gray-50">
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
          
          <main className="flex-1 p-8 ml-64">
            <Routes>
              <Route path="/" element={<Navigate to="/super-admin/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/tenant-management" element={<TenantManagement />} />
              <Route path="/lead-management" element={<LeadManagement />} />
              <Route path="/admin-user-management" element={<AdminUserManagement />} />
              <Route path="/billing-management" element={<BillingManagement />} />
              <Route path="/platform-monitoring" element={<PlatformMonitoring />} />
            </Routes>
          </main>
        </div>
      </div>
    </SuperAdminAuth>
  );
};

export default SuperAdmin;
