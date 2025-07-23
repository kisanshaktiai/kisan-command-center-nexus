
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const { user, isLoading } = useAuth();
  const [clearingSession, setClearingSession] = useState(true);

  useEffect(() => {
    // Clear any stored form data or autocomplete on initial load
    const clearSessionData = async () => {
      // Clear any stored form data in session storage
      sessionStorage.clear();
      
      // Small delay to ensure clearing is complete
      setTimeout(() => setClearingSession(false), 100);
    };
    
    clearSessionData();
  }, []);

  if (isLoading || clearingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>Preparing authentication...</div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/super-admin" replace />;
  }

  return (
    <div className="min-h-screen">
      <SuperAdminAuth autocomplete="off" />
    </div>
  );
}
