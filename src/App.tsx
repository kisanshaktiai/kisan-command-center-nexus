
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { navItems } from "./nav-items";
import SuperAdmin from "./pages/SuperAdmin";
import Overview from "./pages/super-admin/Overview";
import TenantManagement from "./pages/super-admin/TenantManagement";
import FeatureFlags from "./pages/super-admin/FeatureFlags";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="min-h-screen bg-background font-sans antialiased">
        <Toaster />
        <BrowserRouter>
          <Routes>
            {navItems.map(({ to, page }) => (
              <Route key={to} path={to} element={page} />
            ))}
            <Route path="/super-admin" element={<SuperAdmin />}>
              <Route index element={<Overview />} />
              <Route path="tenants" element={<TenantManagement />} />
              <Route path="features" element={<FeatureFlags />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
