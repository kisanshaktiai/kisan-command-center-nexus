
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { BootstrapSetup } from '@/components/auth/BootstrapSetup';
import { authenticationService } from '@/services/AuthenticationService';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const { user, isLoading } = useAuth();
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);

  useEffect(() => {
    checkBootstrapStatus();
  }, []);

  const checkBootstrapStatus = async () => {
    try {
      const isCompleted = await authenticationService.isBootstrapCompleted();
      setNeedsBootstrap(!isCompleted);
    } catch (error) {
      console.error('Error checking bootstrap status:', error);
      setNeedsBootstrap(false); // Default to normal auth if can't determine
    } finally {
      setCheckingBootstrap(false);
    }
  };

  if (isLoading || checkingBootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/super-admin" replace />;
  }

  // Show bootstrap setup if system needs initialization
  if (needsBootstrap) {
    return <BootstrapSetup />;
  }

  // Show normal admin auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <SuperAdminAuth />
    </div>
  );
}
