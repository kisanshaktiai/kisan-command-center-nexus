
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { AdminRegistration } from '@/components/admin/AdminRegistration';

export default function Auth() {
  const { user, isLoading } = useAuth();
  const [isRegistrationMode, setIsRegistrationMode] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div>Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/super-admin" replace />;
  }

  const toggleMode = () => {
    setIsRegistrationMode(!isRegistrationMode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      {isRegistrationMode ? (
        <AdminRegistration onToggleMode={toggleMode} />
      ) : (
        <SuperAdminAuth onToggleMode={toggleMode} />
      )}
    </div>
  );
}
