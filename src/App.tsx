
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthProvider";
import { TenantAuthProvider } from "@/contexts/TenantAuthContext";
import Index from "./pages/Index";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import TenantManagement from "./pages/super-admin/TenantManagement";
import TenantManagementRefactored from "./pages/super-admin/TenantManagementRefactored";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <TenantAuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/tenant-management" element={<TenantManagement />} />
                <Route path="/super-admin/tenant-management-refactored" element={<TenantManagementRefactored />} />
              </Routes>
            </BrowserRouter>
          </TenantAuthProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
