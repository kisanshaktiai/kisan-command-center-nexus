
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';

export default function Auth() {
  const { user, isLoading } = useAuth();

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

  return <SuperAdminAuth />;
}
