
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
import WhiteLabelDataFix from './super-admin/WhiteLabelDataFix';
import MasterCompanies from './super-admin/MasterCompanies';
import MasterProducts from './super-admin/MasterProducts';
import ProductCategories from './super-admin/ProductCategories';
import NdviDataStatus from './super-admin/NdviDataStatus';
import AiCostDashboard from './super-admin/AiCostDashboard';
import BackupStatus from './super-admin/BackupStatus';
import GovernanceReports from './super-admin/GovernanceReports';
import RulesConsole from './super-admin/RulesConsole';
import HypothesisConsole from './super-admin/HypothesisConsole';
import ObservationConsole from './super-admin/ObservationConsole';
import SafetyConsole from './super-admin/SafetyConsole';
import SimulationSandbox from './super-admin/SimulationSandbox';
import ApprovalQueue from './super-admin/ApprovalQueue';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SuperAdmin = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { user, isLoading } = useAuth();

  // Get current admin user data
  const { data: adminUser, isLoading: isAdminLoading } = useQuery({
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
    enabled: !!user,
  });

  // Show loading state
  if (isLoading || isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // Show auth form if not authenticated or no admin user
  if (!user || !adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <SuperAdminAuth />
      </div>
    );
  }

  // Show admin dashboard when authenticated
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
          adminUser={adminUser}
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
            <Route path="/white-label-data-fix" element={<WhiteLabelDataFix />} />
            <Route path="/master-companies" element={<MasterCompanies />} />
            <Route path="/master-products" element={<MasterProducts />} />
            <Route path="/product-categories" element={<ProductCategories />} />
            <Route path="/ndvi-data-status" element={<NdviDataStatus />} />
            <Route path="/ai-costs" element={<AiCostDashboard />} />
            <Route path="/backups" element={<BackupStatus />} />
            <Route path="/governance/reports" element={<GovernanceReports />} />
            <Route path="/governance/rules" element={<RulesConsole />} />
            <Route path="/governance/hypotheses" element={<HypothesisConsole />} />
            <Route path="/governance/observations" element={<ObservationConsole />} />
            <Route path="/governance/safety" element={<SafetyConsole />} />
            <Route path="/governance/simulate" element={<SimulationSandbox />} />
            <Route path="/governance/queue" element={<ApprovalQueue />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default SuperAdmin;
