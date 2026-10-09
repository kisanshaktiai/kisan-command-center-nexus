
import './i18n';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SuperAdmin from "./pages/SuperAdmin";
import AdminInviteRoute from "./pages/AdminInviteRoute";
import AcceptInvitation from "./pages/AcceptInvitation";
import ResetPassword from "./pages/auth/ResetPassword";
import ResetPasswordConfirm from "./pages/auth/ResetPasswordConfirm";
import HealthVersion from "./pages/HealthVersion";
import { UpdateBanner } from "./components/version/UpdateBanner";
import { ImpersonationBanner } from "./components/impersonation/ImpersonationBanner";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <UpdateBanner />
          <ImpersonationBanner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/auth/reset-password-confirm" element={<ResetPasswordConfirm />} />
              <Route path="/super-admin/*" element={<SuperAdmin />} />
              <Route path="/admin-invite/:token" element={<AdminInviteRoute />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/health/version" element={<HealthVersion />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
