import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { navItems } from './nav-items';
import SuperAdmin from './pages/SuperAdmin';
import Auth from './pages/Auth';
import AuthCallback from './pages/auth/AuthCallback';
import ResetPassword from './pages/auth/ResetPassword';
import AdminRegister from './pages/AdminRegister';
import OnboardPartner from './pages/OnboardPartner';
import { AdminInviteRegistration } from '@/components/auth/AdminInviteRegistration';
import Register from './pages/Register';
import AppProviders from './components/providers/AppProviders';

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-register" element={<AdminRegister />} />
        <Route path="/onboard/:token" element={<OnboardPartner />} />
        <Route path="/invite/:token" element={<AdminInviteRegistration />} />
        {navItems.map(({ to, page }) => (
          <Route key={to} path={to} element={page} />
        ))}
        <Route path="/super-admin/*" element={<SuperAdmin />} />
      </Routes>
    </BrowserRouter>
  </AppProviders>
);

export default App;