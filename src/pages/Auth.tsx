
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminAuth } from '@/components/super-admin/SuperAdminAuth';
import { BootstrapSetup } from '@/components/auth/BootstrapSetup';
import { unifiedAuthService } from '@/services/UnifiedAuthService';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const { user, isLoading, isAdmin } = useAuth();
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [checkingBootstrap, setCheckingBootstrap] = useState(true);

  console.log('Auth.tsx: Render state:', { 
    user: user?.id, 
    isLoading, 
    needsBootstrap, 
    checkingBootstrap 
  });

  useEffect(() => {
    checkBootstrapStatus();
  }, []);

  const checkBootstrapStatus = async () => {
    try {
      console.log('Auth.tsx: Checking bootstrap status...');
      const isCompleted = await unifiedAuthService.isBootstrapCompleted();
      console.log('Auth.tsx: Bootstrap completed:', isCompleted);
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

  // CRITICAL FIX: Check bootstrap status BEFORE checking user authentication
  // Show bootstrap setup if system needs initialization
  if (needsBootstrap) {
    return <BootstrapSetup />;
  }

  // Only redirect authenticated ADMIN users to super-admin AFTER bootstrap is completed
  if (user && isAdmin) {
    return <Navigate to="/super-admin" replace />;
  }

  // Show normal admin auth for non-authenticated users when bootstrap is complete
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <SuperAdminAuth />
    </div>
  );
}
