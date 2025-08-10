import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { navItems } from "./nav-items";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SuperAdmin from "./pages/SuperAdmin";
import TenantManagement from "./pages/super-admin/TenantManagement";
import LeadManagement from "./pages/super-admin/LeadManagement";
import AdminUserManagement from "./pages/super-admin/AdminUserManagement";
import TenantOnboarding from "./pages/super-admin/TenantOnboarding";
import BillingManagement from "./pages/super-admin/BillingManagement";
import SubscriptionManagement from "./pages/super-admin/SubscriptionManagement";
import PlatformMonitoring from "./pages/super-admin/PlatformMonitoring";
import FeatureFlags from "./pages/super-admin/FeatureFlags";
import WhiteLabelConfig from "./pages/super-admin/WhiteLabelConfig";
import DataManagement from "./pages/super-admin/DataManagement";
import NotFound from "./pages/NotFound";
import React from 'react';

// Initialize react-query client
// Documentation: https://tanstack.com/query/v4/
// Usage:
// 1. Import `useQuery` and `useMutation` hooks from `@tanstack/react-query`
// 2. Use `useQuery` to fetch data and `useMutation` to update data
// 3. Wrap your app with `QueryClientProvider` and pass the `queryClient` instance

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/super-admin/tenant-management" element={<TenantManagement />} />
          <Route path="/super-admin/lead-management" element={<LeadManagement />} />
          <Route path="/super-admin/admin-user-management" element={<AdminUserManagement />} />
          <Route path="/super-admin/tenant-onboarding" element={<TenantOnboarding />} />
          <Route path="/super-admin/billing-management" element={<BillingManagement />} />
          <Route path="/super-admin/subscription-management" element={<SubscriptionManagement />} />
          <Route path="/super-admin/platform-monitoring" element={<PlatformMonitoring />} />
          <Route path="/super-admin/feature-flags" element={<FeatureFlags />} />
          <Route path="/super-admin/white-label-config" element={<WhiteLabelConfig />} />
          <Route path="/super-admin/data-management" element={<DataManagement />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
